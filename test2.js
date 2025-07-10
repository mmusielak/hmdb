import fs from "fs";
import zlib from "zlib";
import readline from "readline";

async function readFileAsync(path) {
    let readStream = fs.createReadStream(path);

    let stream = readStream.pipe(zlib.createGunzip());

    let lineReader = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
    });

    for await (const line of lineReader) {
        console.log(line);
    }
}

async function readFileHybrid(path) {
    const rl = createInterface({
        input: createReadStream(path),
        crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
        // Process the line.
    });

    await once(rl, "close");
}
