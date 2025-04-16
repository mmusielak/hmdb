import fs from "node:fs";
import sqlite from "node:sqlite";

import { IMDB_SQL, MOVIES_JSON, FUZZY_IDS, IMDB_IDS } from "../settings.js";

export default async function (limit = Number.MAX_SAFE_INTEGER) {
    let db = new sqlite.DatabaseSync(IMDB_SQL);
    let imdb = (fs.existsSync(IMDB_IDS) && JSON.parse(fs.readFileSync(IMDB_IDS).toString())) || {};
    let movies = (fs.existsSync(MOVIES_JSON) && JSON.parse(fs.readFileSync(MOVIES_JSON).toString())) || [];
    let fuzzy = {};

    let stats = {
        cache: 0,
        fetch: 0,
        error: 0,
    };

    for (var i = 0; i < movies.length; i++) {
        if (i > limit) break;

        let item = movies[i];
        let hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

        if (imdb[hash]) {
            stats.cache++;
        } else {
            let title = item.meta.title;
            let release = parseInt(item.meta.release);
            let directors = item.meta.directors.split(", ");

            // filesystem doesn't allow `:` so it's often substituted with `-`
            if (title.includes("-")) {
                title = title.replace(" -", ":");
            }

            /**
             * Query Plan:
             *  SEARCH title USING INDEX idx_title_year (startYear=?)
             *  SEARCH principals USING INDEX idx_principals_tconst_category (tconst=? AND category=?)
             *  SEARCH person USING COVERING INDEX idx_person_primary (primaryName=? AND nconst=?)
             */
            let result = db
                .prepare(
                    `SELECT DISTINCT title.tconst FROM title
                    JOIN principals ON title.tconst = principals.tconst
                    JOIN person ON principals.nconst = person.nconst
                    WHERE 
                        title.startYear = ?
                        AND principals.category = 'director'
                        AND person.primaryName COLLATE NOCASE = ?
                        AND (title.primaryTitle COLLATE NOCASE = ? OR title.originalTitle COLLATE NOCASE = ?)`
                )
                .get(release, directors[0], title, title);

            if (!result) {
                result = db
                    .prepare(
                        `SELECT DISTINCT title.tconst FROM title
                            JOIN principals ON title.tconst = principals.tconst
                            JOIN person ON principals.nconst = person.nconst
                            WHERE 
                                title.startYear BETWEEN ? AND ?
                                AND principals.category = 'director'
                                AND person.primaryName COLLATE NOCASE IN (${directors.map(() => "?").join(",")})
                                AND (title.primaryTitle COLLATE NOCASE = ? OR title.originalTitle COLLATE NOCASE = ?)`
                    )
                    .get(release - 1, release + 1, ...directors, title, title);

                if (result) {
                    fuzzy[hash] = result.tconst;
                }
            }
            if (!result) {
                result = db
                    .prepare(
                        `SELECT DISTINCT title.tconst FROM title
                            WHERE 
                                title.startYear = ?
                                AND (title.primaryTitle COLLATE NOCASE = ? OR title.originalTitle COLLATE NOCASE = ?)`
                    )
                    .get(release, title, title);

                if (result) {
                    fuzzy[hash] = result.tconst;
                }
            }

            if (result) {
                stats.fetch++;
                imdb[hash] = result.tconst;
            } else {
                stats.error++;
                console.error("✘ MISS", item.files.location);
            }

            // write progress
            process.stdout.write(` > ${i} / ${movies.length} \x1b[1G`);
        }
    }

    db.close();
    fs.writeFileSync(IMDB_IDS, JSON.stringify(imdb, null, 2));
    fs.writeFileSync(FUZZY_IDS, JSON.stringify(fuzzy, null, 2));

    // clear progress line
    process.stdout.write(`\x1b[1G`);

    console.info(">", i, "/", movies.length);
    console.info("<", "cache:", stats.cache, "fetch:", stats.fetch, "error:", stats.error);
}
