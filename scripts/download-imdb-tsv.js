import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Readable } from "node:stream";
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

        console.log(`Downloading ${fileName}...`);

        if (fs.existsSync(filePath)) {
            let headers = await fetch(url, { method: "HEAD" })
                .then((res) => {
                    if (res.ok) {
                        return res.headers;
                    } else {
                        console.error(`Error: ${res.status} ${res.statusText}`);
                    }
                })
                .catch((err) => {
                    console.error(`Request failed: ${err.message}`);
                });

            if (!headers) {
                throw new Error("Connection error, cannot continue.");
            }

            let localSize = fs.statSync(filePath).size;

            let remoteSize = headers.get("content-length") || 0;
            let remoteDate = headers.get("last-modified") || 0;

            //console.info(`Local size: ${localSize.toLocaleString()} bytes`);
            //console.info(`Remote size: ${remoteSize.toLocaleString()} bytes`);

            const staleDataTreshold = 48 * 60 * 60 * 1000; // 24 hours

            let dateDiff = Date.now() - Date.parse(remoteDate);

            if (remoteSize && remoteSize == localSize && dateDiff < staleDataTreshold) {
                console.info("File is up to date, skipping download.");

                continue; // Skip download
            } else {
                console.info("File is outdated, downloading again.");
                console.info(`Remote date: ${remoteDate}, remote size: ${remoteSize}, local size: ${localSize}`);

                fs.unlinkSync(filePath); // Remove the outdated file
            }
        }

        let res = await fetch(url);

        if (res.ok) {
            let webStream = Readable.fromWeb(res.body);
            let fileStream = fs.createWriteStream(filePath);

            await stream.pipeline(webStream, fileStream);

            let etag = res.headers.get("etag") || "unknown";
            let bytes = res.headers.get("content-length") || 0;

            console.info(`${fileName}: ${etag} ${bytes} bytes`);
        }
    }
}
