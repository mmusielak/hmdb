import * as fs from "node:fs";
import { stringify } from "node:querystring";
import SECRETS from "../secrets.js";

const IMDB_IDS = "cache/imdb-ids.json";
const OMDB_CACHE = "cache/omdb-details.json";
const MOVIES_JSON = "cache/movies.json";

export default async function (limit = Number.MAX_SAFE_INTEGER) {
    let stats = {
        cache: 0,
        fetch: 0,
        error: 0,
    };

    let ids = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS).toString())) || {};
    let cache = (fs.existsSync(OMDB_CACHE) && JSON.parse(fs.readFileSync(OMDB_CACHE).toString())) || {};
    let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON).toString())) || [];

    for (var i = 0; i < movies.length; i++) {
        if (i > limit) break;

        let item = movies[i];
        let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

        if (cache[hash]) {
            stats.cache++;
        } else if (ids[hash]) {
            let details = await fetchDetails(ids[hash]);

            if (details) {
                stats.fetch++;

                // TODO: verify data
                cache[hash] = details;
            } else {
                stats.error++;
                console.error("✘ MISS", item.files.location);
            }
        }

        // write progress
        process.stdout.write(` > ${i} / ${movies.length} \x1b[1G`);
    }

    // clear progress line
    process.stdout.write(`\x1b[1G`);

    fs.writeFileSync(OMDB_CACHE, JSON.stringify(cache, null, 2));

    console.info(">", i, "/", movies.length);
    console.info("<", "cache:", stats.cache, "fetch:", stats.fetch, "error:", stats.error);
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
