import fs from "node:fs";
import { stringify } from "node:querystring";

import SECRETS from "../secrets.js";
import { TMDB_CACHE, MOVIES_JSON, IMDB_IDS } from "../settings.js";

export default async function (limit = Number.MAX_SAFE_INTEGER) {
    let imdb = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS).toString())) || {};
    let cache = (fs.existsSync(TMDB_CACHE) && JSON.parse(fs.readFileSync(TMDB_CACHE).toString())) || {};
    let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON).toString())) || [];

    let stats = {
        cache: 0,
        fetch: 0,
        error: 0,
    };

    for (var i = 0; i < movies.length; i++) {
        if (i > limit) break;

        let item = movies[i];
        let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

        if (cache[hash]) {
            stats.cache++;
        } else {
            let details = imdb[hash] ? await fetchDetailsByFind(imdb[hash]) : await fetchDetailsBySearch(item);

            // TODO: verify data
            if (details) {
                stats.fetch++;

                // TODO: verify data
                cache[hash] = details;
            } else {
                stats.error++;
                console.error("✘ MISS", item.files.location);
            }
        }

        // update IMDB ID
        if (cache[hash]?.imdb_id) {
            if (!imdb[hash]) {
                imdb[hash] = cache[hash].imdb_id;
            } else if (cache[hash].imdb_id != imdb[hash]) {
                console.error("✘ MISMATCH", item.files.location);
            }
        }

        // write progress
        process.stdout.write(` > ${i} / ${movies.length} \x1b[1G`);
    }

    // clear progress line
    process.stdout.write(`\x1b[1G`);

    fs.writeFileSync(IMDB_IDS, JSON.stringify(imdb, null, 2));
    fs.writeFileSync(TMDB_CACHE, JSON.stringify(cache, null, 2));

    console.info(">", i, "/", movies.length);
    console.info("<", "cache:", stats.cache, "fetch:", stats.fetch, "error:", stats.error);
}

async function fetchDetailsByFind(id) {
    let qs = stringify({ api_key: SECRETS.TMDB, external_source: "imdb_id" });
    return fetch(`https://api.themoviedb.org/3/find/${id}?${qs}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => {
            if (res?.tv_results?.[0]?.id) return callDetails("tv", res?.tv_results?.[0]?.id, qs);
            if (res?.movie_results?.[0]?.id) return callDetails("movie", res?.movie_results?.[0]?.id, qs);
        });
}

async function fetchDetailsBySearch(item) {
    let qs = stringify({ api_key: SECRETS.TMDB, query: item.meta.title, year: item.meta.release });
    return (await callSearch("tv", qs)) || (await callSearch("movie", qs));
}

async function callSearch(type, qs) {
    return fetch(`https://api.themoviedb.org/3/search/${type}?${qs}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => res?.results?.[0]?.id)
        .then((id) => (id ? callDetails(type, id, qs) : null));
}

async function callDetails(type, id, qs) {
    return fetch(`https://api.themoviedb.org/3/${type}/${id}?${qs}`).then((res) => (res.ok ? res.json() : null));
}
