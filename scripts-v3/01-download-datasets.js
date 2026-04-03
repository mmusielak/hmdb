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

import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import stream from "node:stream/promises";

import { CACHE_FOLDER, DATASETS } from "../settings.js";

const TEMP_FILEPATH = path.join(CACHE_FOLDER, "%.imdb.tsv.gz");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default async function () {
    for (let dataset of DATASETS) {
        let fileName = path.basename(dataset.url);
        let filePath = path.join(CACHE_FOLDER, fileName);

        try {
            let localDate = await fs.stat(filePath).birthtime;
            let timeSinceBirth = Date.now() - Date.parse(localDate);

            if (timeSinceBirth < SEVEN_DAYS_MS) {
                continue;
            } else {
                // download
            }
        } catch (error) {
            if (error.code != "ENOENT") {
                console.error(`File system error while processing ${filename}: ${error.message}`);
                throw error;
            } else {
                // download
            }
        }

        try {
            const response = await fetch(dataset.url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const fileStream = createWriteStream(TEMP_FILEPATH);
            const webStream = Readable.fromWeb(response.body);

            await stream.pipeline(webStream, fileStream);
            await fs.rename(TEMP_FILEPATH, filePath);

            console.log(`Download Success! Saved to ${filePath}`);
        } catch (error) {
            console.error(`Failed to download ${dataset.url}: ${error.message}`);
            throw error;
        } finally {
            try {
                await fs.unlink(TEMP_FILEPATH);
            } catch {}
        }
    }
}

async function checkIfFileExists(url, fileName, filePath) {
    try {
        let localDate = await fs.stat(filePath).birthtime;
        let timeSinceBirth = Date.now() - Date.parse(localDate);

        if (timeSinceBirth < SEVEN_DAYS_MS) {
            return true; // File is fresh
        } else {
            let res = await fetch(url, { method: "HEAD" });

            if (res.ok) {
                let remoteSize = headers.get("content-length") || 0;
                let localSize = fs.statSync(filePath).size;

                if (remoteSize && remoteSize == localSize) {
                    console.info("File is up to date, skipping download.");

                    return true;
                } else {
                    console.info("File is outdated, downloading again.");
                    console.info(`Remote date: ${remoteDate}, remote size: ${remoteSize}, local size: ${localSize}`);

                    // Remove the outdated file
                    await fs.unlink(filePath);
                }
            } else {
                throw Error("Network error");
            }
        }
    } catch {}
    return false;
}

async function downloadFile2(url, fileName, filePath) {
    let res = await fetch(url);

    if (res.ok) {
        try {
            await fs.unlink(TEMP_FILEPATH);
        } catch {}

        let webStream = Readable.fromWeb(res.body);
        let fileStream = fs.createWriteStream(TEMP_FILEPATH);

        await stream.pipeline(webStream, fileStream);

        await fs.rename(TEMP_FILEPATH, filePath);

        let etag = res.headers.get("etag") || "unknown";
        let bytes = res.headers.get("content-length") || 0;
        let remoteDate = res.headers.get("last-modified") || 0;

        console.info(`${fileName}: ${etag} ${bytes} bytes`);
    } else {
        throw Error("Network error");
    }
}
