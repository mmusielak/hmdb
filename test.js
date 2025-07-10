import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import zlib from "node:zlib";
import stream from "node:stream/promises";

import { CACHE_FOLDER } from "./settings.js";

let url = "https://datasets.imdbws.com/name.basics.tsv.gz";

if (!fs.existsSync(CACHE_FOLDER)) {
    fs.mkdirSync(CACHE_FOLDER, { recursive: true });
}

await fetch(url + "?q=" + Date.now(), { method: "HEAD" }).then((res) => {
    if (res.ok) {
        console.log("head", res.headers);
    }
});

await fetch(url + "?q=" + Date.now(), { method: "GET" }).then((res) => {
    if (res.ok) {
        console.log("get", res.headers);
    }
});
/*
var urlo = new URL(url);
var options = {
    hostname: "18.66.147.50",
    hostname2: "datasets.imdbws.com",
    path: "/name.basics.tsv.gz",
    port: 443,
    method: "GET",
    headers: {
        Accept: "binary/octet-stream",
    },
};

await new Promise((resolve, reject) => {
    https.request(options, (res) => {
        if (res.statusCode === 200) {
            console.log(res.headers);
            resolve(true);
        } else {
            reject();
        }
    });
});
//*/
console.log("fin");

//main();

async function main() {
    let fileName = path.basename(url);
    let filePath = path.join(CACHE_FOLDER, fileName);

    if (fs.existsSync(filePath)) {
        let headers = await fetch(url + "?q=" + Date.now(), { method: "HEAD" })
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

        console.log(headers);

        let remoteSize = headers.get("content-length") || 0;
        let remoteDate = headers.get("last-modified") || 0;
        console.log(`File: ${fileName}`);
        console.info(`Local size: ${localSize} bytes`);
        console.info(`Remote size: ${remoteSize} bytes`);

        const staleDataTreshold = 48 * 60 * 60 * 1000; // 24 hours

        let dateDiff = Date.now() - Date.parse(remoteDate);

        if (remoteSize && remoteSize == localSize && dateDiff < staleDataTreshold) {
            console.info("File is up to date, skipping download.");

            return;
        } else {
            console.info("File is outdated, downloading again.");

            fs.rmSync(filePath); // Remove the outdated file
        }
    }

    await new Promise((resolve, reject) => {
        https
            .get(url + "?q=" + Date.now(), (res) => {
                if (res.statusCode === 200) {
                    let totalBytes = res.headers["content-length"] || 0;

                    console.log(res.headers);

                    //let zlibStream = zlib.createGunzip();
                    let writeStream = fs.createWriteStream(filePath);

                    // zlibStream.on("error", reject);
                    // writeStream.on("error", reject);

                    // stream.pipeline is critical to avoid backpressure!
                    stream.pipeline(res /*, zlibStream*/, writeStream).then(() => {
                        console.info(`done ${fileName}: ${totalBytes} bytes`);

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
