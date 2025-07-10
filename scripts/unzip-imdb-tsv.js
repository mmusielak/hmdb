import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import stream from "node:stream/promises";

import { CACHE_FOLDER } from "../settings.js";

export default async function () {
    const datasets = [
        "https://datasets.imdbws.com/name.basics.tsv.gz",
        "https://datasets.imdbws.com/title.akas.tsv.gz",
        "https://datasets.imdbws.com/title.basics.tsv.gz",
        "https://datasets.imdbws.com/title.crew.tsv.gz",
        "https://datasets.imdbws.com/title.principals.tsv.gz",
        "https://datasets.imdbws.com/title.ratings.tsv.gz",
    ];

    for (let url of datasets) {
        let fileName = path.basename(url);
        let filePath = path.join(CACHE_FOLDER, fileName);

        let fname = path.basename(filePath, ".gz");
        let fpath = path.join(CACHE_FOLDER, fname);

        if (fs.existsSync(filePath)) {
            console.log(`Unzipping ${filePath}... to ${fpath}`);

            let inStream = fs.createReadStream(filePath);
            let fileStream = fs.createWriteStream(fpath);
            let unzipStream = zlib.createGunzip();

            await stream.pipeline(inStream, unzipStream, fileStream);
        } else {
            console.log("file missing", filePath);
        }
    }
}
