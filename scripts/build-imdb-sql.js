import fs from "node:fs/promises";
import path from "node:path";
import sqlite from "node:sqlite";

import { CACHE_FOLDER, IMDB_SQL, PRAGMA_DB_DELETE, PRAGMA_DB_OPTIMIZE } from "../settings.js";

export default async function () {
    let db = new sqlite.DatabaseSync(IMDB_SQL);

    // full throtle
    db.exec(`PRAGMA locking_mode = EXCLUSIVE`);
    db.exec(`PRAGMA synchronous = OFF`);
    db.exec(`PRAGMA journal_mode = OFF`);
    db.exec(`PRAGMA cache_size = 1000000`);
    db.exec(`PRAGMA temp_store = MEMORY`);

    console.time("⏱");

    db.exec(`DROP TABLE IF EXISTS person`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS person (
            nconst              CHAR(9) PRIMARY KEY,
            primaryName         VARCHAR COLLATE NOCASE,
            birthYear           INTEGER,
            deathYear           INTEGER,
            primaryProfession   VARCHAR,
            knownForTitles      VARCHAR
        ) WITHOUT ROWID`
    );

    db.exec(`DROP TABLE IF EXISTS title`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS title (
            tconst             CHAR(9) PRIMARY KEY,
            titleType          VARCHAR,
            primaryTitle       VARCHAR COLLATE NOCASE,
            originalTitle      VARCHAR COLLATE NOCASE,
            isAdult            BOOLEAN,
            startYear          INTEGER,
            endYear            INTEGER,
            runtimeMinutes     INTEGER,
            genres             VARCHAR
        ) WITHOUT ROWID`
    );

    db.exec(`DROP TABLE IF EXISTS akas`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS akas (
            tconst              CHAR(9),
            ordering            INTEGER,
            title               VARCHAR,
            region              VARCHAR,
            language            VARCHAR,
            types               VARCHAR,
            attributes          VARCHAR,
            isOriginalTitle     BOOLEAN,

            PRIMARY KEY (tconst, ordering)
            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        ) WITHOUT ROWID`
    );

    db.exec(`DROP TABLE IF EXISTS principals`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS principals (
            tconst              CHAR(9),
            ordering            INTEGER,
            nconst              CHAR(9),
            category            VARCHAR,
            job                 VARCHAR,
            characters          VARCHAR,

            PRIMARY KEY (tconst, ordering)
            -- FOREIGN KEY (tconst) REFERENCES title(tconst),
            -- FOREIGN KEY (nconst) REFERENCES person(nconst)
        ) WITHOUT ROWID`
    );

    db.exec(`DROP TABLE IF EXISTS ratings`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS ratings (
            tconst              CHAR(9) PRIMARY KEY,
            averageRating       FLOAT,
            numVotes            INTEGER

            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        ) WITHOUT ROWID`
    );

    db.exec(`DROP TABLE IF EXISTS crew`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS crew (
            tconst              CHAR(9) PRIMARY KEY,
            directors           VARCHAR,
            writers             VARCHAR

            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        ) WITHOUT ROWID`
    );

    console.timeLog("⏱", "create tables");

    // read data from tsv files
    await importTableFromTsv(db, "name.basics.tsv", "person");
    await importTableFromTsv(db, "title.basics.tsv", "title");
    //await importTableFromTsv(db, "title.akas.tsv", "akas");
    await importTableFromTsv(db, "title.principals.tsv", "principals");
    await importTableFromTsv(db, "title.ratings.tsv", "ratings");
    await importTableFromTsv(db, "title.crew.tsv", "crew");

    console.timeLog("⏱", "import tsv files");

    if (PRAGMA_DB_DELETE) {
        // remove unnecessary entries (adult, tv shows, misc) and...
        db.exec(`DELETE FROM title WHERE titleType NOT IN ('movie', 'short', 'video', 'tvMovie') OR isAdult <> 0`);
        db.exec(`DELETE FROM principals WHERE category NOT IN ('director', 'writer', 'actor', 'actress')`);

        console.timeLog("⏱", "delete non-movie entries");

        // ... trim orphaned data
        db.exec(`DELETE FROM principals WHERE principals.tconst NOT IN (SELECT title.tconst FROM title)`);
        db.exec(`DELETE FROM person WHERE person.nconst NOT IN (SELECT principals.nconst FROM principals)`);
        db.exec(`DELETE FROM ratings WHERE ratings.tconst NOT IN (SELECT title.tconst FROM title)`);
        db.exec(`DELETE FROM akas WHERE akas.tconst NOT IN (SELECT title.tconst FROM title)`);
        db.exec(`DELETE FROM crew WHERE crew.tconst NOT IN (SELECT title.tconst FROM title)`);

        // this should be faster but it's not?
        // db.exec(`DELETE FROM principals WHERE NOT EXISTS (SELECT 1 FROM title WHERE title.tconst = principals.tconst)`);
        // db.exec(`DELETE FROM person WHERE NOT EXISTS (SELECT 1 FROM principals WHERE principals.nconst = person.nconst)`);
        // db.exec(`DELETE FROM ratings WHERE NOT EXISTS (SELECT 1 FROM title WHERE title.tconst = ratings.tconst)`);
        // db.exec(`DELETE FROM akas WHERE NOT EXISTS (SELECT 1 FROM title WHERE title.tconst = akas.tconst)`);
        // db.exec(`DELETE FROM crew WHERE NOT EXISTS (SELECT 1 FROM title WHERE title.tconst = crew.tconst)`);

        console.timeLog("⏱", "delete orphaned entries");
    }

    if (PRAGMA_DB_OPTIMIZE) {
        // create indexes for known query scenarios
        db.exec(`CREATE INDEX IF NOT EXISTS idx_title_year ON title(startYear)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_title_primary ON title(primaryTitle COLLATE NOCASE)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_title_original ON title(originalTitle COLLATE NOCASE)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_person_primary ON person(primaryName COLLATE NOCASE)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_principals_tconst_category ON principals(tconst, category)`);

        console.timeLog("⏱", "create indexes");

        // optimize database
        db.exec(`PRAGMA optimize`);

        console.timeLog("⏱", "optimize");

        // shrink before closing, this can take some time
        db.exec(`vacuum`);

        console.timeLog("⏱", "vacuum");
    }

    db.close();

    console.timeEnd("⏱");
}

async function importTableFromTsv(db, fileName, tableName) {
    let filePath = path.join(CACHE_FOLDER, fileName);
    let fileHandle = await fs.open(filePath, fs.constants.O_RDONLY);

    let lines = 0;

    let statement;
    let values;

    console.time(fileName);
    console.info(fileName);

    // https://www.sqlite.org/faq.html#q19
    db.exec(`BEGIN IMMEDIATE`);

    for await (let line of fileHandle.readLines()) {
        if (lines++) {
            values = line.split("\t");
            // convert \N character to a NULL
            values = values.map((val) => (val == "\\N" ? "" : val));
            statement.run(...values);
        } else {
            let columns = line.split("\t").length;
            statement = db.prepare(`INSERT INTO '${tableName}' VALUES (?${",?".repeat(columns - 1)})`);
        }
    }

    db.exec(`COMMIT`);

    await fileHandle.close();

    console.timeEnd(fileName);
    console.info(`${fileName}: ${lines.toLocaleString()} lines`);
}
