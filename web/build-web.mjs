import * as fs from "node:fs";
import sqlite from "node:sqlite";

const IMDB_SQL = "cache/imdb.sqlite";
const IMDB_IDS = "cache/imdb-ids.json";
const MOVIES_JSON = "cache/movies.json";
const TMDB_CACHE = "cache/tmdb-details.json";
const OMDB_CACHE = "cache/omdb-details.json";

var appData = [];

var localData = JSON.parse(fs.readFileSync(MOVIES_JSON));
var imdbIds = JSON.parse(fs.readFileSync(IMDB_IDS));
var tmdbDetails = JSON.parse(fs.readFileSync(TMDB_CACHE));
var omdbDetails = JSON.parse(fs.readFileSync(OMDB_CACHE));

console.time("total");

let db = new sqlite.DatabaseSync(IMDB_SQL);

let queryTitle = db.prepare("SELECT * FROM title WHERE tconst = ?");
let queryCrew = db.prepare("SELECT * FROM crew WHERE tconst = ?");

let query;
var count = 0;

var _genres = new Set();

for (let item of localData) {
    if (count++ > 10) {
        //break;
    }

    //process.stdout.write(` > ${((count / localData.length) * 100) | 0}% \x1b[0G`);

    let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

    let imdbId = imdbIds[hash];
    let omdb = omdbDetails[hash];
    let tmdb = tmdbDetails[hash];

    if (!imdbId) {
        console.log("missing id for", hash);
        continue;
    }

    if (item.files.content.length == 0) {
        console.log("missing content", hash);
        continue;
    }

    let queryTitle = db.prepare("SELECT * FROM title WHERE tconst = ?");
    var imdb = queryTitle.get(imdbId);

    if (!imdb) {
        console.log("wtf", hash, imdbId);
        continue;
    }

    if (!tmdb) {
        console.log("missing tmdb", hash);
        continue;
    }

    var date = item.files.content[0].date;
    for (let i = 0; i < item.files.content.length; i++) {
        if (new Date(item.files.content[i].date) > new Date(date)) {
            date = item.files.content[i].date;
        }
    }

    let result = {
        local: {
            date: date,
            size: item.files.content.reduce((acc, el) => acc + el.size, 0),
            location: item.files.location,
        },
        rating: {
            imdb: Number.parseInt(omdb.imdbRating) * 10,
            meta: Number.parseInt(omdb.Ratings.filter((el) => el.Source == "Metacritic")[0]?.Value),
            rotten: Number.parseInt(omdb.Ratings.filter((el) => el.Source == "Rotten Tomatoes")[0]?.Value),
        },
        external: {
            imdb: imdbId,
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

    // /*
    let titleA = result.title.replace(": ", " - ");
    let titleB = result.originalTitle.replace(": ", " - ");
    if (
        item.meta.title.toUpperCase() != titleA.toUpperCase() &&
        item.meta.title.toUpperCase() != titleB.toUpperCase()
    ) {
        //console.log("error", "title", hash, ">", titleA, "//", titleB);
    }
    if (item.meta.directors != result.directors) {
        //   console.log("error", "directors", hash, ">", result.directors);
    }
    if (item.meta.release != result.release) {
        console.log("error", "release", hash, ">", result.release);
    }

    //*/
    appData.push(result);
}

var src = fs.readFileSync("web/web-src.html").toString();
fs.writeFileSync("web/hmdb.html", src.replace('[["DB"]]', JSON.stringify(appData, null, 2)));

console.log(localData.length, appData.length);
console.timeEnd("total");
