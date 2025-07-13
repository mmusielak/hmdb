/**
 * Downloads IMDB datasets from the official source and saves them to the CACHE folder for later use.
 * Datasets are in TSV format and are compressed with GZIP.
 *
 * In case of network error the script will break by design.
 *
 * Flowchart:
 *   1 check if the file already exists in the cache folder
 *   2. if it exists - make a HEAD request to see if the file is up to date
 *   3. if the file exists and it's up to date we `continue` to the next file
 *   4. if the file does not exists or is outdated attempt to download and stream content to a temporary file
 *   5. if download is successful - rename the temporary file and proceed to the next file
 *   6. if download or network fails or the process is interrupted - attempt to remove the temporary file
 */

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import stream from "node:stream/promises";

import { CACHE_FOLDER, DATASETS } from "../settings.js";

const TEMP_FILEPATH = path.join(CACHE_FOLDER, "temp.imdb.tsv.gz");

export default async function () {
    process.addListener("SIGINT", onExitHandler);

    for (let dataset of DATASETS) {
        let fileName = path.basename(dataset.url);
        let filePath = path.join(CACHE_FOLDER, fileName);

        let isStaleOrMissing = await staleOrMissing(dataset.url, fileName, filePath);

        if (isStaleOrMissing) {
            await downloadFile(dataset.url, fileName, filePath);
        } else {
            console.info();
        }
    }

    process.removeListener("SIGINT", onExitHandler);
}

async function staleOrMissing(url, fileName, filePath) {
    const staleDataTreshold = 48 * 60 * 60 * 1000; // 48 hours

    if (fs.existsSync(filePath)) {
        let localDate = fs.statSync(filePath).birthtime;
        let timeSinceBirth = Date.now() - Date.parse(localDate);

        if (timeSinceBirth < staleDataTreshold) {
            return false; // File is fresh
        } else {
            let res = await fetch(url, { method: "HEAD" });

            if (res.ok) {
                let remoteSize = headers.get("content-length") || 0;
                let localSize = fs.statSync(filePath).size;

                if (remoteSize && remoteSize == localSize) {
                    console.info("File is up to date, skipping download.");

                    return false;
                } else {
                    console.info("File is outdated, downloading again.");
                    console.info(`Remote date: ${remoteDate}, remote size: ${remoteSize}, local size: ${localSize}`);

                    fs.unlinkSync(filePath); // Remove the outdated file
                }
            } else {
                //handleNetworkError(res, null);
            }
        }
    }

    return true;
}

async function downloadFile(url, fileName, filePath) {
    let res = await fetch(url);

    if (res.ok) {
        if (fs.existsSync(TEMP_FILEPATH)) {
            fs.unlinkSync(TEMP_FILEPATH);
        }

        let webStream = Readable.fromWeb(res.body);
        let fileStream = fs.createWriteStream(TEMP_FILEPATH);

        await stream.pipeline(webStream, fileStream);

        fs.renameSync(TEMP_FILEPATH, filePath);

        let etag = res.headers.get("etag") || "unknown";
        let bytes = res.headers.get("content-length") || 0;
        let remoteDate = res.headers.get("last-modified") || 0;

        console.info(`${fileName}: ${etag} ${bytes} bytes`);
    } else {
        //handleNetworkError(res, null);
    }
}

function handleNetworkError(res, err) {}

function onExitHandler() {
    if (fs.existsSync(TEMP_FILEPATH)) {
        fs.unlinkSync(TEMP_FILEPATH);
        console.info("Temporary file removed on exit.");
    }
    process.exit(0);
}
