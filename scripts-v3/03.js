import fs from "node:fs";
import sqlite from "node:sqlite";

import { IMDB_DATABASE_PATH, MOVIES_JSON, FUZZY_IDS, IMDB_IDS } from "../settings.js";

import removeDiacritics from "../remove-diacritics.js";

export default async function (limit = Number.MAX_SAFE_INTEGER) {
    let db = new sqlite.DatabaseSync(IMDB_DATABASE_PATH);
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

        if (0 && imdb[hash]) {
            stats.cache++;
        } else {
            let title = item.meta.title;
            let release = parseInt(item.meta.release);
            let directors = item.meta.directors.split(", ");

            // filesystem doesn't allow `:` so it's often substituted with `-`
            if (title.includes("-")) {
                title = title.replace(" -", ":");
            }

            title = removeDiacritics(title);
            directors = directors.map(removeDiacritics);

            /**
             * Query Plan:
             *  SEARCH title USING INDEX idx_title_year (startYear=?)
             *  SEARCH principals USING INDEX idx_principals_tconst_category (tconst=? AND category=?)
             *  SEARCH person USING COVERING INDEX idx_person_primary (primaryName=? AND nconst=?)
             */
            let result = db
                .prepare(
                    `SELECT DISTINCT titles.tconst FROM titles
                    JOIN principals ON titles.tconst = principals.tconst
                    JOIN names ON principals.nconst = names.nconst
                    WHERE 
                        titles.startYear = ?
                        AND principals.category = 'director'
                        AND names.primaryNameStripped = ?
                        AND (titles.primaryTitleStripped = ? OR titles.originalTitleStripped = ?)`
                )
                .get(release, directors[0], title, title);

            if (!result) {
                result = db
                    .prepare(
                        `SELECT DISTINCT titles.tconst FROM titles
                            JOIN principals ON titles.tconst = principals.tconst
                            JOIN names ON principals.nconst = names.nconst
                            WHERE 
                                titles.startYear BETWEEN ? AND ?
                                AND principals.category = 'director'
                                AND names.primaryNameStripped IN (${directors.map(() => "?").join(",")})
                                AND (titles.primaryTitleStripped = ? OR titles.originalTitleStripped = ?)`
                    )
                    .get(release - 1, release + 1, ...directors, title, title);

                if (result) {
                    fuzzy[hash] = result.tconst;
                }
            }
            if (!result) {
                result = db
                    .prepare(
                        `SELECT DISTINCT titles.tconst FROM titles
                            WHERE 
                                titles.startYear = ?
                                AND (titles.primaryTitleStripped = ? OR titles.originalTitleStripped = ?)`
                    )
                    .get(release, title, title);

                if (result) {
                    fuzzy[hash] = result.tconst;
                }
            }

            if (!result) {
                result = db
                    .prepare(
                        `SELECT DISTINCT titles.tconst FROM titles
                            JOIN principals ON titles.tconst = principals.tconst
                            JOIN names ON principals.nconst = names.nconst
                            WHERE 
                                titles.startYear = ?
                                AND principals.category = 'director'
                                AND names.primaryNameStripped IN (${directors.map(() => "?").join(",")})`
                    )
                    .get(release, ...directors);

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
    //fs.writeFileSync(IMDB_IDS, JSON.stringify(imdb, null, 2));
    //fs.writeFileSync(FUZZY_IDS, JSON.stringify(fuzzy, null, 2));

    // clear progress line
    process.stdout.write(`\x1b[1G`);

    console.info(">", i, "/", movies.length);
    console.info("<", "cache:", stats.cache, "fetch:", stats.fetch, "error:", stats.error);
}
