import fs from "node:fs/promises";
import path from "node:path";

import { MOVIES_JSON } from "../settings.js";

export default async function (...directories) {
    let movies = [];

    while (directories.length) {
        let dir = directories.shift();

        try {
            let dirents = await fs.readdir(dir, { withFileTypes: true });

            for (let dirent of dirents) {
                if (dirent.isDirectory()) {
                    let fullPath = path.join(dir, dirent.name);

                    let info = analyze(fullPath);

                    if (info) {
                        let exists = movies.find((item) => {
                            return item.meta.title == info.meta.title && item.meta.release == info.meta.release;
                        });

                        if (exists) {
                            console.warn("✘ DUPLICATE", exists.files.location, info.files.location);
                        } else {
                            for await (let file of listContent(fullPath)) {
                                info.files.content.push(file);
                            }

                            movies.push(info);
                        }
                    } else {
                        directories.unshift(fullPath);
                    }
                }
            }
        } catch (err) {
            //console.error(err);
        }
    }

    await fs.writeFile(MOVIES_JSON, JSON.stringify(movies, null, 2));

    console.info("<", movies.length);
}

async function* listContent(directoryPath, startingPath = null) {
    startingPath = startingPath || directoryPath;

    let dirents = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const dirent of dirents) {
        let fullPath = path.join(directoryPath, dirent.name);

        if (dirent.isDirectory()) {
            yield* listContent(fullPath, startingPath);
        } else {
            let fileStat = await fs.stat(fullPath);

            yield {
                name: fullPath.substring(startingPath.length + 1),
                date: fileStat.ctime.toISOString().substring(0, 10),
                size: fileStat.size,
            };
        }
    }
}

function analyze(directoryPath) {
    // match `Title (Director(s), Release)`
    let directoryName = path.basename(directoryPath);
    let re = directoryName.match(/^(.+) \((.+), (\d{4})\)$/);

    if (re && re[1].startsWith("[miniseries]")) {
        re[1] = re[1].substring(12);
    }

    return (
        re && {
            files: {
                content: [],
                location: directoryPath,
            },
            meta: {
                title: re[1].trim(),
                directors: re[2].trim(),
                release: re[3].trim(),
            },
        }
    );
}
