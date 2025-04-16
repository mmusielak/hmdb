import * as fs from "node:fs";

const IMDB_IDS = "cache/imdb-ids.json";
const TMDB_CACHE = "cache/tmdb-details.json";
const MOVIES_JSON = "cache/movies.json";

let ids = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS))) || {};
let tmdb = (fs.existsSync(TMDB_CACHE) && JSON.parse(fs.readFileSync(TMDB_CACHE))) || {};
let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON))) || [];

let fixed = 0;
let missing = 0;

for (let i = 0; i < movies.length; i++) {
    let item = movies[i];
    let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

    if (ids[hash] && tmdb[hash] && tmdb[hash].imdb_id && ids[hash] != tmdb[hash].imdb_id) {
        console.log("mismatch", item.files.location);
    }

    if (!ids[hash]) {
        if (tmdb[hash] && tmdb[hash].imdb_id) {
            fixed++;
            ids[hash] = tmdb[hash].imdb_id;
        } else {
            missing++;
            console.log("missing", item.files.location);
        }
    }
}

fs.writeFileSync(IMDB_IDS, JSON.stringify(ids, null, 2));

console.log("fixed", fixed);
console.log("missing", missing);
