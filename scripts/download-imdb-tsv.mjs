import * as fs from "node:fs";
import path from "node:path";
import * as https from "node:https";
import * as zlib from "node:zlib";
import { pipeline } from "node:stream/promises";

export default async function (basePath) {
    // https://developer.imdb.com/non-commercial-datasets/
    await download(basePath, "https://datasets.imdbws.com/name.basics.tsv.gz");
    await download(basePath, "https://datasets.imdbws.com/title.akas.tsv.gz");
    await download(basePath, "https://datasets.imdbws.com/title.basics.tsv.gz");
    await download(basePath, "https://datasets.imdbws.com/title.crew.tsv.gz");
    await download(basePath, "https://datasets.imdbws.com/title.principals.tsv.gz");
    await download(basePath, "https://datasets.imdbws.com/title.ratings.tsv.gz");
}

async function download(basePath, url) {
    let fileName = path.basename(url, ".gz");
    let filePath = path.join(basePath, fileName);

    let fileExists = false;

    if (fs.existsSync(filePath)) {
        let fileStats = fs.statSync(filePath);
        var timeSinceCreation = Date.now() - fileStats.ctime;

        if (timeSinceCreation < 1000 * 60 * 60 * 24) {
            // fresh file exists
            fileExists = true;

            console.info(`${fileName}: @ ${fileStats.ctime.toISOString().substring(0, 10)}`);
        } else {
            // remove stale file
            fs.rmSync(filePath);
        }
    }

    if (! fileExists) {
        console.time(fileName);
        console.info(url);

        return new Promise((resolve, reject) => {
            https
                .get(url, (res) => {
                    if (res.statusCode != 200) {
                        // handle errors?
                    }

                    let currentBytes = 0;
                    let totalBytes = res.headers["content-length"];

                    let zlibStream = zlib.createGunzip();
                    let writeStream = fs.createWriteStream(filePath);

                    res.on("data", (chunk) => {
                        currentBytes += chunk.length;

                        process.stdout.write(` > ${((currentBytes / totalBytes) * 100) | 0}% \x1b[0G`);
                    });

                    // happy path
                    res.on("error", reject);
                    zlibStream.on("error", reject);
                    writeStream.on("error", reject);

                    pipeline(res, zlibStream, writeStream).then(() => {
                        console.timeEnd(fileName);
                        console.info(`${fileName}: ${totalBytes.toLocaleString()} bytes`);

                        resolve();
                    });
                    //.catch(reject);
                })
                .on("error", reject);
        });
    }
}
