import fs from "node:fs";
import sqlite from "node:sqlite";

import { IMDB_SQL, MOVIES_JSON, IMDB_IDS, TMDB_CACHE, OMDB_CACHE } from "../settings.js";

console.time("⏱");

let db = new sqlite.DatabaseSync(IMDB_SQL);

let movies = JSON.parse(fs.readFileSync(MOVIES_JSON));
let imdbIds = JSON.parse(fs.readFileSync(IMDB_IDS));
let tmdbDetails = JSON.parse(fs.readFileSync(TMDB_CACHE));
let omdbDetails = JSON.parse(fs.readFileSync(OMDB_CACHE));

let data = [];

for (let item of movies) {
    let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

    let id = imdbIds[hash];
    let omdb = omdbDetails[hash];
    let tmdb = tmdbDetails[hash];

    if (!id) {
        console.error("✘ MISSING ID", hash);
        continue;
    }

    if (!tmdb) {
        console.error("✘ MISSING TMDB", hash);
        continue;
    }
    if (!omdb) {
        console.error("✘ MISSING OMDB", hash);
        continue;
    }

    if (!item.files.content.length) {
        console.error("✘ MISSING CONTENT", hash);
        continue;
    }

    let imdb = db.prepare("SELECT * FROM title WHERE tconst = ?").get(id);

    if (!imdb) {
        console.error("✘ MISSING IMDB DB ENTRY", hash, id);
        continue;
    }

    let date = item.files.content.reduce((acc, cur) => {
        return new Date(cur.date) > new Date(acc) ? cur.date : acc;
    }, item.files.content[0].date);

    let result = {
        local: {
            date: date,
            size: item.files.content.reduce((acc, el) => acc + el.size, 0),
            location: item.files.location,
        },
        rating: {
            imdb: parseInt(omdb.imdbRating) * 10,
            meta: parseInt(omdb.Ratings.filter((el) => el.Source == "Metacritic")[0]?.Value),
            rotten: parseInt(omdb.Ratings.filter((el) => el.Source == "Rotten Tomatoes")[0]?.Value),
        },
        external: {
            imdb: id,
            tmdb: tmdb.id,
        },

        poster: omdb.Poster,

        title: imdb.primaryTitle, // omdb.Title,
        originalTitle: imdb.originalTitle,

        languages: tmdb.spoken_languages.map((dto) => dto.name), // omdb.Language,

        genres: imdb.genres.split(","), // tmdb.genres.map((dto) => dto.name), // omdb.Genre,
        overview: omdb.Plot,
        release: imdb.startYear, // omdb.Year,
        runtime: imdb.runtimeMinutes, //Number.parseInt(omdb.Runtime),
        //*
        actors: omdb.Actors.split(", "),
        directors: omdb.Director.split(", "),
        writers: omdb.Writer.split(", "),
        //*/
        /*
        directors: tmdb.credits.crew
            .filter((dto) => dto.department == "Directing" && dto.job == "Director")
            .map((dto) => dto.name),
        writers: tmdb.credits.crew.filter((dto) => dto.department == "Writing").map((dto) => dto.name),
        actors: tmdb.credits.cast.slice(0, 20).map((dto) => dto.name),
        //*/
    };

    data.push(result);
}

console.info(">", movies.length);
console.info("<", data.length);

// JSONP style export
fs.writeFileSync("build/hmdb-db.js", "const db = " + JSON.stringify(data, null, 2));

console.timeEnd("⏱");
