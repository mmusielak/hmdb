import * as fs from "node:fs";
import sqlite from "node:sqlite";

const IMDB_SQL = "cache/imdb.sqlite";
const IMDB_IDS = "cache/imdb-ids.json";
const MOVIES_JSON = "cache/movies.json";

export default async function () {
    let db = new sqlite.DatabaseSync(IMDB_SQL);

    let ids = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS))) || {};
    let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON))) || [];

    let counter = 0;

    /**
     * Query Plan:
     *  SEARCH title USING INDEX idx_title_year (startYear=?)
     *  SEARCH principals USING INDEX idx_principals_tconst_category (tconst=? AND category=?)
     *  SEARCH person USING COVERING INDEX idx_person_primary (primaryName=? AND nconst=?)
     */
    let strictStatement = db.prepare(
        `SELECT title.tconst FROM title
            JOIN principals ON title.tconst = principals.tconst
            JOIN person ON principals.nconst = person.nconst
            WHERE 
                title.startYear = ?
                AND principals.category = 'director'
                AND person.primaryName COLLATE NOCASE = ?
                AND (title.primaryTitle COLLATE NOCASE = ? OR title.originalTitle COLLATE NOCASE = ?)`
    );
    let fuzzyStatement = db.prepare(
        `SELECT title.tconst FROM title
            JOIN principals ON title.tconst = principals.tconst
            JOIN person ON principals.nconst = person.nconst
            WHERE 
                title.startYear = ?
                AND principals.category = 'director'
                AND person.primaryName COLLATE NOCASE = ?
                AND (title.primaryTitle COLLATE NOCASE LIKE ? OR title.originalTitle COLLATE NOCASE LIKE ?)`
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

        // write progress
        process.stdout.write(` > ${i} / ${movies.length} \x1b[1G`);

        // if title has more than one word let's try LIKE query with first one
        let slice = title.includes(" ") && title.substring(0, title.indexOf(" ")) + "%";

        let result =
            strictStatement.get(release, director, title, title) ||
            (slice && fuzzyStatement.get(release, director, slice, slice));

        if (result) {
            counter++;
            ids[hash] = result.tconst;
        }
    }

    fs.writeFileSync(IMDB_IDS, JSON.stringify(ids, null, 2));

    db.close();

    // clear progress line
    process.stdout.write(`\x1b[1G`);

    console.info(">", movies.length);
    console.info("<", counter);
}
