import fs from "node:fs";
import path from "node:path";

import { DIR_LISTINGS, MOVIES_JSON } from "../settings.js";

const FILE_CONTENT_REGEXP = /^(?<DD>\d{2})\/(?<MM>\d{2})\/(?<YYYY>\d{4})  \d\d\:\d\d(?<size>[\d\s,]{18}) (?<name>.+)$/;

export default async function () {
    let files = arguments.length ? arguments : DIR_LISTINGS;

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
                    console.warn("✘ DUPLICATE", exists.files.location, info.files.location);
                } else {
                    movies.push(info);
                }
            }
        } else if (current && dir.startsWith(current.files.location)) {
            // Make sure that the regexp matches locale!
            if ((re = line.match(FILE_CONTENT_REGEXP))) {
                current.files.content.push({
                    name: path.join(dir, re.groups.name).substring(current.files.location.length + 1),
                    date: re.groups.YYYY + "-" + re.groups.MM + "-" + re.groups.DD, // reconstruct date
                    size: Number(re.groups.size.replace(/,/g, "")), // remove whitespace
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
