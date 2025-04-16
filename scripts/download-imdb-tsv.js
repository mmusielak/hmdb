import fs from "node:fs";
import path from "node:path";
import https from "node:https";
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
        let fileName = path.basename(url, ".gz");
        let filePath = path.join(CACHE_FOLDER, fileName);

        console.time(fileName);
        console.info(url);

        // look ma, no hands!
        await new Promise((resolve, reject) => {
            https
                .get(url, (res) => {
                    if (res.statusCode === 200) {
                        let totalBytes = res.headers["content-length"] || 0;

                        let zlibStream = zlib.createGunzip();
                        let writeStream = fs.createWriteStream(filePath);

                        // zlibStream.on("error", reject);
                        // writeStream.on("error", reject);

                        // stream.pipeline is critical to avoid backpressure!
                        stream.pipeline(res, zlibStream, writeStream).then(() => {
                            console.timeEnd(fileName);
                            console.info(`${fileName}: ${totalBytes.toLocaleString()} bytes`);

                            resolve(true);
                        });
                    } else {
                        // hic sunt dracones
                        reject();
                    }
                })
                .on("error", reject);
        });
    }
}
