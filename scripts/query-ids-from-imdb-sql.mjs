import * as fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const IMDB_SQL = "cache/imdb.sqlite";
const IMDB_IDS = "cache/imdb-ids.json";
const MOVIES_JSON = "cache/movies.json";

export default async function (basePath) {
    let counter = 0;

    let db = new Database(IMDB_SQL);
    let ids = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS))) || {};
    let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON))) || [];

    let statement = db.prepare(
        `SELECT title.tconst FROM title
            JOIN principals ON title.tconst = principals.tconst
            JOIN person ON principals.nconst = person.nconst
            WHERE 
                title.startYear = ?
                AND principals.category = 'director'
                AND person.primaryName = ?
                AND (title.primaryTitle = ? OR title.originalTitle = ?)`
    );
    let statement3 = db.prepare(
        `SELECT title.tconst FROM title
            JOIN principals ON title.tconst = principals.tconst
            JOIN person ON principals.nconst = person.nconst
            WHERE 
                title.startYear = ?
                AND principals.category = 'director'
                AND person.primaryName = ?
                AND (title.primaryTitle LIKE ? OR title.originalTitle LIKE ?)`
    );

    for (var i = 0; i < movies.length; i++) {
        let item = movies[i];

        let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

        if (ids[hash]) {
            continue;
        }

        let title = item.meta.title;
        let release = item.meta.release;
        let director = item.meta.directors.split(", ")[0];

        // filesystem doesn't allow `:` so it's often substituted with `-`
        if (item.meta.title.includes("-")) {
            title = title.replace(" -", ":");
        }

        // if title has more than one word let's try LIKE query with first one
        let slice = title.includes(" ") && title.substring(0, title.indexOf(" ")) + "%";

        process.stdout.write(` > ${i} \x1b[0G`);

        let result =
            statement.get(release, director, title, title) ||
            (slice && statement3.get(release, director, slice, slice));

        if (result) {
            counter++;
            ids[hash] = result.tconst;
        }
    }

    fs.writeFileSync(IMDB_IDS, JSON.stringify(ids, null, 2));

    console.info(">", movies.length);
    console.info("<", counter);
}
