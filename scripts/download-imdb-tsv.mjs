import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as zlib from "node:zlib";
import * as stream from "node:stream/promises";

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
        let filePath = path.join("cache/", fileName);

        console.time(fileName);
        console.info(url);

        // look ma, no hands!
        await new Promise((resolve, reject) => {
            https
                .get(url, (res) => {
                    if (res.statusCode == 200) {
                        let totalBytes = res.headers["content-length"];

                        let zlibStream = zlib.createGunzip();
                        let writeStream = fs.createWriteStream(filePath);

                        // zlibStream.on("error", reject);
                        // writeStream.on("error", reject);

                        // stream.pipeline is critical to avoid backpressure!
                        stream.pipeline(res, zlibStream, writeStream).then(() => {
                            console.timeEnd(fileName);
                            console.info(`${fileName}: ${totalBytes.toLocaleString()} bytes`);

                            resolve();
                        });
                    } else {
                        // hic sunt dracones
                    }
                })
                .on("error", reject);
        });
    }
}
