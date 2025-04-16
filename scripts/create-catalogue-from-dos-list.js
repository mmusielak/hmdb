import fs from "node:fs";
import path from "node:path";

import { MOVIES_JSON } from "../settings.js";

export default async function (...files) {
    // read files and concat content into a single list
    let list = files.reduce((acc, file) => acc.concat(fs.readFileSync(file).toString().split("\r\n")), []);

    let movies = [];

    let dir;
    let current = null;

    for (let re, line, i = 0; i < list.length; i++) {
        line = list[i];

        if (line == "") {
            continue;
        } else if ((re = line.match(/^ Directory of (.+)$/))) {
            dir = re[1].replace(/\\/g, "/");

            let info = analyze(dir);

            if (info) {
                current = info;

                let exists = movies.find((item) => {
                    return item.meta.title == info.meta.title && item.meta.release == info.meta.release;
                });

                if (exists) {
                    console.warn("✘ duplicate", exists.files.location, info.files.location);
                } else {
                    movies.push(info);
                }
            }
        } else if (current && dir.startsWith(current.files.location)) {
            // Make sure that the regexp matches locale!
            // match(/^(\d\d\.\d\d.\d\d\d\d  \d\d\:\d\d)([\d\s]{18})
            // match(/^(\d\d\d\d-\d\d-\d\d  \d\d\:\d\d)([\d\s,]{18})
            if ((re = line.match(/^(\d\d\d\d-\d\d-\d\d  \d\d\:\d\d [A|P]M)([\d\s,]{18}) (.+)$/))) {
                current.files.content.push({
                    name: path.join(dir, re[3]).substring(current.files.location.length + 1),
                    date: re[1].substring(0, 10),
                    size: Number(re[2].replace(/,/g, "")), // remove whitespace
                });
            }
        }
    }

    fs.writeFileSync(MOVIES_JSON, JSON.stringify(movies, null, 2));

    console.info(">", list.length);
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
