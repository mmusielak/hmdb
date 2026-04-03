import fs from "node:fs";
import { stringify } from "node:querystring";

import SECRETS from "./secrets.js";
import { OMDB_CACHE, MOVIES_JSON, IMDB_IDS } from "./settings.js";

class Queue {
    constructor(maxConcurrent = Infinity) {
        this.queue = [];
        this.pendingPromises = 0;
        this.maxConcurrent = maxConcurrent;
    }

    enqueue(promiseGenerator) {
        return new Promise((resolve, reject) => {
            this.queue.push({ promiseGenerator, resolve, reject });
            //this._dequeue();
        });
    }
    async run() {
        while (this.pendingPromises < this.maxConcurrent && this.queue.length > 0) {
            this._dequeue();
        }
    }

    async _dequeue() {
        if (this.pendingPromises >= this.maxConcurrent) {
            return;
        }

        if (this.queue.length === 0) {
            return;
        }

        this.pendingPromises++;

        const { promiseGenerator, resolve, reject } = this.queue.shift();

        try {
            const result = await promiseGenerator();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.pendingPromises--;
            this._dequeue();
        }
    }
}
if (fs.existsSync(OMDB_CACHE)) {
    fs.unlinkSync(OMDB_CACHE);
}
console.time();
await main(100);
console.timeEnd();

async function main(limit = Number.MAX_SAFE_INTEGER) {
    let imdb = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS).toString())) || {};
    let cache = (fs.existsSync(OMDB_CACHE) && JSON.parse(fs.readFileSync(OMDB_CACHE).toString())) || {};
    let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON).toString())) || [];

    let stats = {
        cache: 0,
        fetch: 0,
        error: 0,
    };

    let queue = new Queue(4);

    for (var i = 0; i < movies.length; i++) {
        if (i > limit) break;

        let item = movies[i];
        let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

        if (cache[hash]) {
            stats.cache++;
        } else if (imdb[hash]) {
            queue.enqueue(async () => {
                let details = await fetchDetails(imdb[hash]);

                if (details) {
                    stats.fetch++;

                    // TODO: verify data
                    cache[hash] = details;
                } else {
                    stats.error++;
                    console.error("✘ MISS", item.files.location);
                }
            });
        }

        // write progress
        //process.stdout.write(` > ${i} / ${movies.length} \x1b[1G`);
    }

    await queue.run();

    fs.writeFileSync(OMDB_CACHE, JSON.stringify(cache, null, 2));

    // clear progress line
    process.stdout.write(`\x1b[1G`);

    console.info(">", i, "/", movies.length);
    console.info("<", "cache:", stats.cache, "fetch:", stats.fetch, "error:", stats.error);
}

async function foo(id) {
    return fetchDetails(imdb[hash]);

    if (details) {
        stats.fetch++;

        // TODO: verify data
        cache[hash] = details;
    } else {
        stats.error++;
        console.error("✘ MISS", item.files.location);
    }
}

async function fetchDetails(id) {
    let qs = stringify({
        apikey: SECRETS.OMDB,
        i: id,
        plot: "full",
    });

    return fetch(`http://www.omdbapi.com/?${qs}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => (res?.Response == "True" ? res : null));
}
