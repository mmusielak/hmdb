import { createWriteStream } from "node:fs";
import { stat, rename, unlink, utimes, mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import path from "node:path";

import { CACHE_FOLDER, DATASETS } from "../settings.js";

const IDLE_TIMEOUT_MS = 30 * 1000;
const datasets = [
    "https://datasets.imdbws.com/name.basics.tsv.gz",
    //    "https://datasets.imdbws.com/title.akas.tsv.gz",
    "https://datasets.imdbws.com/title.basics.tsv.gz",
    //    "https://datasets.imdbws.com/title.crew.tsv.gz",
    "https://datasets.imdbws.com/title.principals.tsv.gz",
    //    "https://datasets.imdbws.com/title.ratings.tsv.gz",
];

const toMB = (b) => (b / (1024 * 1024)).toFixed(2);

export default async function () {
    let outputDir = CACHE_FOLDER;

    await mkdir(outputDir, { recursive: true });

    for (const url of datasets) {
        const filename = path.basename(new URL(url).pathname);
        const finalPath = path.join(outputDir, filename);
        const tempPath = path.join(outputDir, `${filename}.tmp`);

        try {
            // 1. Get Metadata (HEAD)
            const headRes = await fetch(url, { method: "HEAD" });
            const serverEtag = headRes.headers.get("etag")?.replace(/"/g, "");
            const serverLastModified = headRes.headers.get("last-modified");
            const serverSize = Number(headRes.headers.get("content-length"));

            // 2. Freshness Check (Size + Time)
            try {
                const localStats = await stat(finalPath);
                const serverDate = new Date(serverLastModified);
                if (
                    localStats.size === serverSize &&
                    Math.floor(localStats.mtimeMs / 1000) === Math.floor(serverDate.getTime() / 1000)
                ) {
                    console.log(`[PASS] ${filename} is up to date.`);
                    continue;
                }
            } catch {
                /* File doesn't exist */
            }

            console.log(`[SYNC] ${filename} (Newer version found)`);

            // 3. Setup Hashing & Download
            const controller = new AbortController();
            let timeoutId = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);

            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Initialize the MD5 hasher
            // https://stackoverflow.com/questions/75723647/calculate-md5-from-aws-s3-etag
            let hash = createHash("md5");
            let downloaded = 0;
            let chunks = null;

            const MULTIPART_THRESHOLD = 8388608;
            const MULTIPART_CHUNKSIZE = 8388608;

            // Monitor: Resets timeout, updates progress, AND updates hash
            async function* integrityMonitor(webStream) {
                for await (const chunk of webStream) {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);

                    downloaded += chunk.length;
                    hash.update(chunk); // Add chunk to hash calculation

                    if (chunks == null) {
                        if (downloaded >= MULTIPART_THRESHOLD) {
                            chunks = [];
                        }
                    }
                    if (chunks != null) {
                        if (downloaded % MULTIPART_CHUNKSIZE == 0) {
                            chunks.push(hash.digest());
                            hash = createHash("md5");
                        }
                    }

                    if (process.stdout.isTTY) {
                        const percent = serverSize ? Math.round((downloaded / serverSize) * 100) : 0;
                        process.stdout.write(`\r  -> Progress: ${percent}% (${toMB(downloaded)}MB)`);
                    }

                    yield chunk;
                }
            }

            await pipeline(
                Readable.fromWeb(response.body),
                new MinimumChunkSizeStream(1048576),
                integrityMonitor,
                createWriteStream(tempPath),
            );

            clearTimeout(timeoutId);

            // 4. Verify Hash against ETag
            //const localMd5 = hash.digest("hex");

            let localMd5;

            if (chunks) {
                if (downloaded % MULTIPART_CHUNKSIZE != 0) {
                    chunks.push(hash.digest());
                }

                let chunksMd5 = createHash("md5");
                chunksMd5.update(Buffer.concat(chunks));
                localMd5 = chunksMd5.digest("hex") + "-" + chunks.length;
            } else {
                localMd5 = hash.digest("hex");
            }

            // Some servers use "W/" prefix for weak ETags; we check the hex part.
            if (serverEtag && !serverEtag.includes(localMd5) && !localMd5.includes(serverEtag)) {
                throw new Error(`Integrity Check Failed! Server MD5: ${serverEtag}, Local MD5: ${localMd5}`);
            }

            // 5. Finalize
            await rename(tempPath, finalPath);

            if (serverLastModified) {
                const serverDate = new Date(serverLastModified);
                await utimes(finalPath, serverDate, serverDate);
            }

            process.stdout.write(`\n  -> Verified and Saved.\n`);
        } catch (err) {
            process.stdout.write("\n");
            console.error(`  -> [ERROR] ${filename}: ${err.message}`);
        } finally {
            try {
                await unlink(tempPath);
            } catch {}
        }
    }
}

import { Transform } from "stream";

class MinimumChunkSizeStream extends Transform {
    constructor(minChunkSize = 8192) {
        super();
        this.buffer = Buffer.alloc(0);
        this.minChunkSize = minChunkSize;
    }

    _transform(chunk, _encoding, callback) {
        // Add new data to our buffer
        this.buffer = Buffer.concat([this.buffer, chunk]);

        // While we have enough data, push complete chunks
        while (this.buffer.length >= this.minChunkSize) {
            const chunkToSend = this.buffer.subarray(0, this.minChunkSize);
            this.push(chunkToSend);
            this.buffer = this.buffer.subarray(this.minChunkSize);
        }

        callback();
    }

    _flush(callback) {
        // Push any remaining data as the final chunk (may be smaller than minChunkSize)
        if (this.buffer.length > 0) {
            this.push(this.buffer);
        }
        callback();
    }
}
