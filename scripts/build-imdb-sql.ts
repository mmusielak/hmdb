import * as fs from "node:fs/promises";
import * as path from "node:path";
import sqlite from "node:sqlite";

const IMDB_SQL : string = "cache/imdb.sqlite";

export default async function () {
    let db = new sqlite.DatabaseSync(IMDB_SQL);

    // full throtle
    db.exec("PRAGMA synchronous = OFF");
    db.exec("PRAGMA journal_mode = OFF");

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
            isOriginalTitle     BOOLEAN

            -- PRIMARY KEY (tconst, ordering),
            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        )`
    );
    db.exec(`DROP TABLE IF EXISTS principals`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS principals (
            tconst              CHAR(9),
            ordering            INTEGER,
            nconst              CHAR(9),
            category            VARCHAR,
            job                 VARCHAR,
            characters          VARCHAR

            -- PRIMARY KEY (tconst, ordering),
            -- FOREIGN KEY (tconst) REFERENCES title(tconst),
            -- FOREIGN KEY (nconst) REFERENCES person(nconst)
        )`
    );
    db.exec(`DROP TABLE IF EXISTS rating`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS rating (
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

    await readTable(db, "cache/name.basics.tsv", "person");
    await readTable(db, "cache/title.basics.tsv", "title");
    //await readTable(db, "cache/title.akas.tsv", "akas");
    await readTable(db, "cache/title.principals.tsv", "principals");
    await readTable(db, "cache/title.ratings.tsv", "rating");
    await readTable(db, "cache/title.crew.tsv", "crew");

    console.time("clean");
    console.log("clean");

    // remove unnecessary entries (adult, tv shows, misc) and...
    db.exec(
        `DELETE FROM title WHERE genres = '' OR isAdult <> 0 OR titleType IN ('tvEpisode', 'tvPilot', 'tvShort', 'tvSpecial', 'videoGame')`
    );
    // ... trim orphaned data
    db.exec(`DELETE from principals WHERE category NOT IN ('director', 'writer', 'actor', 'actress')`);
    db.exec(`DELETE from principals WHERE principals.tconst NOT IN (SELECT title.tconst FROM title)`);
    db.exec(`DELETE FROM person WHERE person.nconst NOT IN (SELECT principals.nconst FROM principals)`);
    db.exec(`DELETE FROM rating WHERE rating.tconst NOT IN (SELECT title.tconst FROM title)`);
    db.exec(`DELETE FROM akas WHERE akas.tconst NOT IN (SELECT title.tconst FROM title)`);
    db.exec(`DELETE FROM crew WHERE crew.tconst NOT IN (SELECT title.tconst FROM title)`);

    console.timeLog("clean");

    // create indexes for known query scenarios
    db.exec(`CREATE INDEX idx_title_year ON title(startYear)`);
    db.exec(`CREATE INDEX idx_title_primary ON title(primaryTitle COLLATE NOCASE)`);
    db.exec(`CREATE INDEX idx_title_original ON title(originalTitle COLLATE NOCASE)`);
    db.exec(`CREATE INDEX idx_person_primary ON person(primaryName COLLATE NOCASE)`);
    db.exec(`CREATE INDEX idx_principals_tconst_category ON principals(tconst, category)`);

    console.timeLog("clean");

    // shrink before closing, this can take some time
    db.exec(`vacuum`);

    console.timeEnd("clean");

    db.close();
}

async function readTable(db, filePath, tableName) {
    let fileName = path.basename(filePath);
    let fileHandle = await fs.open(filePath, "r");

    let lines = 0;
    let statement, values;

    console.time(fileName);
    console.info(fileName);

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
