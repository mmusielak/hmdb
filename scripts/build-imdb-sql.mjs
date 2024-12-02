import * as fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

const IMDB_SQL = "cache/imdb.sqlite";

// 202411
// 350k / s
export default async function (basePath) {
    let db = new Database();

    // full throtle
    db.exec("PRAGMA synchronous = OFF");
    db.exec("PRAGMA journal_mode = OFF");

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

            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        )`
    );
    db.exec(
        `CREATE TABLE IF NOT EXISTS principals (
            tconst              CHAR(9),
            ordering            INTEGER,
            nconst              CHAR(9),
            category            VARCHAR,
            job                 VARCHAR,
            characters          VARCHAR

            -- FOREIGN KEY (tconst) REFERENCES title(tconst),
            -- FOREIGN KEY (nconst) REFERENCES person(nconst)
        )`
    );
    db.exec(
        `CREATE TABLE rating (
            tconst              CHAR(9) PRIMARY KEY,
            averageRating       FLOAT,
            numVotes            INTEGER

            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        ) WITHOUT ROWID`
    );
    db.exec(
        `CREATE TABLE crew (
            tconst              CHAR(9) PRIMARY KEY,
            directors           VARCHAR,
            writers             VARCHAR

            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        ) WITHOUT ROWID`
    );

    await read(db, basePath, "name.basics.tsv", "person");
    await read(db, basePath, "title.basics.tsv", "title");
    //await read(db, basePath, "title.akas.tsv", "akas");
    await read(db, basePath, "title.principals.tsv", "principals");
    await read(db, basePath, "title.ratings.tsv", "rating");
    await read(db, basePath, "title.crew.tsv", "crew");

    console.time("clean");
    console.log("clean");

    db.exec(
        `DELETE FROM title WHERE isAdult <> 0 OR titleType IN ('tvEpisode', 'tvPilot', 'tvShort', 'tvSpecial', 'videoGame') OR genres = ''`
    );
    db.exec(`DELETE from principals WHERE category NOT IN ('director', 'writer', 'actor', 'actress')`);
    db.exec(`DELETE from principals WHERE principals.tconst NOT IN (SELECT title.tconst FROM title)`);
    db.exec(`DELETE FROM person WHERE person.nconst NOT IN (SELECT principals.nconst FROM principals)`);
    db.exec(`DELETE FROM rating WHERE rating.tconst NOT IN (SELECT title.tconst FROM title)`);
    //db.exec(`DELETE FROM akas WHERE akas.tconst NOT IN (SELECT title.tconst FROM title)`);
    db.exec(`DELETE FROM crew WHERE crew.tconst NOT IN (SELECT title.tconst FROM title)`);

    db.exec(`CREATE INDEX IF NOT EXISTS ptIdx ON title (primaryTitle COLLATE NOCASE, startYear)`);
    db.exec(`CREATE INDEX IF NOT EXISTS otIdx ON title (originalTitle COLLATE NOCASE, startYear)`);
    db.exec(`CREATE INDEX IF NOT EXISTS ncIdx ON principals (tconst, category)`);

    console.timeLog("clean");

    db.exec(`CREATE INDEX idx_title_titles_year ON title (primaryTitle, originalTitle, startYear)`);
    db.exec(`CREATE INDEX idx_principals_tconst_category_nconst ON principals (tconst, category, nconst)`);
    db.exec(`CREATE INDEX idx_person_name_nconst ON person (primaryName, nconst)`);

    console.timeLog("clean");

    db.exec(`vacuum`);

    console.timeEnd("clean");

    await db.backup(IMDB_SQL);
}

async function read(db, basePath, fileName, tableName) {
    console.time(fileName);
    console.info(fileName);

    let filePath = path.join(basePath, fileName);
    let fileHandle = await fs.open(filePath, "r");

    let lines = 0;
    let statement, values;

    db.exec("BEGIN IMMEDIATE");

    for await (let line of fileHandle.readLines()) {
        if (lines++) {
            values = line.split("\t").map((val) => (val == "\\N" ? "" : val));
            statement.run(values);
        } else {
            let columns = line.split("\t").length;
            statement = db.prepare(`INSERT INTO '${tableName}' VALUES (?${",?".repeat(columns - 1)})`);
        }
    }

    db.exec("COMMIT");

    console.timeEnd(fileName);
    console.info(`${fileName}: ${lines.toLocaleString()} lines`);
}
