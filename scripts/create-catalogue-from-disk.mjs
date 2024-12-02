import * as fs from "node:fs/promises";
import path from "node:path";

const MOVIES_JSON = "cache/movies.json";

export default async function (...directories) {
    let movies = [];

    let dir;
    let dirents;

    while (directories.length) {
        dir = directories.pop();

        try {
            dirents = await fs.readdir(dir, { withFileTypes: true });

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
                            movies.push(info);
                        }
                    } else {
                        directories.push(fullPath);
                    }
                }
            }
        } catch (err) {}
    }

    fs.writeFileSync(MOVIES_JSON, JSON.stringify(movies, null, 2));

    console.info("<", movies.length);
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
