import fs from "node:fs";
import path from "node:path";
import sqlite from "node:sqlite";

import removeDiacritics from "./remove-diacritics.js";

import { DATASETS, CACHE_FOLDER, IMDB_DATABASE_PATH, PRAGMA_DB_DELETE, PRAGMA_DB_OPTIMIZE } from "../settings.js";

export default async function () {
    let db = new sqlite.DatabaseSync(IMDB_DATABASE_PATH);

    // full throttle
    db.exec(`PRAGMA locking_mode = EXCLUSIVE`);
    db.exec(`PRAGMA synchronous = OFF`);
    db.exec(`PRAGMA journal_mode = OFF`);
    db.exec(`PRAGMA cache_size = 1000000`);
    db.exec(`PRAGMA temp_store = MEMORY`);

    console.time("⏱");

    db.exec(`DROP TABLE IF EXISTS titles`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS titles (
            tconst             CHAR(9) PRIMARY KEY,
            -- titleType          VARCHAR,
            primaryTitle       VARCHAR,
            primaryTitleStripped       VARCHAR COLLATE NOCASE,
            originalTitle      VARCHAR,
            originalTitleStripped      VARCHAR COLLATE NOCASE,
            
            -- isAdult            BOOLEAN,
            startYear          INTEGER
            -- endYear            INTEGER,
            -- runtimeMinutes     INTEGER
            -- genres             VARCHAR,
        ) WITHOUT ROWID`
    );
    //(db => db.prepare(`INSERT INTO title VALUES (?, ?, ?, ?, ?)`))
    let stmt = db.prepare(`INSERT INTO titles VALUES (?, ?, ?, ?, ?, ?)`);

    let tconsts = {};
    let tconsts$ = 0;

    await readTable(
        db,
        "title.basics.tsv.gz",

        (line) => {
            let values = line.split("\t");

            if (values[4] == "1" || !["movie", "short", "video", "tvMovie"].includes(values[1])) {
                return;
            }

            stmt.run(
                values[0],
                values[2],
                removeDiacritics(values[2]),
                values[3],
                removeDiacritics(values[3]),
                values[5]
            );

            tconsts$++;
            tconsts[values[0]] = true;
        }
    );

    console.log(tconsts$);

    db.exec(`DROP TABLE IF EXISTS principals`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS principals (
            tconst              CHAR(9),
            ordering            INTEGER,
            nconst              CHAR(9),
            category            VARCHAR,
            -- job                 VARCHAR,
            -- characters          VARCHAR,

            PRIMARY KEY (tconst, ordering)
            -- FOREIGN KEY (tconst) REFERENCES title(tconst),
            -- FOREIGN KEY (nconst) REFERENCES person(nconst)
        ) WITHOUT ROWID`
    );

    stmt = db.prepare(`INSERT INTO principals VALUES (?, ?, ?, ?)`);

    let nconsts = {};
    let nconsts$ = 0;

    await readTable(
        db,
        "title.principals.tsv.gz",

        (line) => {
            let values = line.split("\t");

            if (!tconsts[values[0]] || !["director", "writer", "actor", "actress"].includes(values[3])) {
                return;
            }

            stmt.run(values[0], values[1], values[2], values[3]);
            nconsts$++;
            nconsts[values[2]] = true;
        }
    );

    console.log(nconsts$);

    db.exec(`DROP TABLE IF EXISTS names`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS names (
            nconst              CHAR(9) PRIMARY KEY,
            primaryName     VARCHAR,
            primaryNameStripped         VARCHAR COLLATE NOCASE,
            birthYear           INTEGER,
            deathYear           INTEGER
            -- primaryProfession   VARCHAR,
            -- knownForTitles      VARCHAR
        ) WITHOUT ROWID`
    );

    stmt = db.prepare(`INSERT INTO names VALUES (?, ?, ?, ?, ?)`);

    await readTable(
        db,
        "name.basics.tsv.gz",

        (line) => {
            let values = line.split("\t");

            if (!nconsts[values[0]]) {
                return;
            }
            if (values[3] == "\\N") values[3] = "";

            stmt.run(values[0], values[1], removeDiacritics(values[1]), values[2], values[3]);
        }
    );

    db.exec(`DROP TABLE IF EXISTS ratings`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS ratings (
            tconst              CHAR(9) PRIMARY KEY,
            rating       FLOAT
            -- numVotes            INTEGER,

            -- FOREIGN KEY (tconst) REFERENCES title(tconst)
        ) WITHOUT ROWID`
    );

    stmt = db.prepare(`INSERT INTO ratings VALUES (?, ?)`);

    await readTable(
        db,
        "title.ratings.tsv.gz",

        (line) => {
            let values = line.split("\t");

            if (!tconsts[values[0]]) {
                return;
            }

            stmt.run(values[0], values[1]);
        }
    );

    console.timeLog("⏱", "import tsv files");

    db.exec(`CREATE INDEX IF NOT EXISTS idx_title_year ON titles(startYear)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_title_primary ON titles(primaryTitleStripped COLLATE NOCASE)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_title_original ON titles(originalTitleStripped COLLATE NOCASE)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_name_primary ON names(primaryNameStripped COLLATE NOCASE)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_principals_tconst_category ON principals(tconst, category)`);

    console.timeLog("⏱", "create indexes");
    db.exec(`PRAGMA optimize`);
    db.exec(`vacuum`);
    db.close();

    console.timeEnd("⏱");
}
import events from "node:events";
import { createInterface } from "node:readline";
import zlib from "node:zlib";

async function readTable(db, dataset, action) {
    let fileName = path.basename(dataset);
    let filePath = path.join(CACHE_FOLDER, fileName);

    console.time(fileName);
    console.info(fileName);

    // https://www.sqlite.org/faq.html#q19
    db.exec(`BEGIN IMMEDIATE`);

    let zlibStream = zlib.createGunzip();
    let tsvStream = fs.createReadStream(filePath);

    let readLinesInterface = createInterface({
        input: tsvStream.pipe(zlibStream),
        crlfDelay: Infinity, // recognize all instances of CR LF as a single line break
    });

    let lines = 0;
    let insertStatement = null;

    for await (let line of readLinesInterface) {
        if (lines++) {
            action(line);
        }
    }

    db.exec(`COMMIT`);

    console.timeEnd(fileName);
    console.info(`${fileName}: ${lines.toLocaleString()} lines`);
}

function removeDiacritics2(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
