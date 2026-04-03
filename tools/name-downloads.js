import fs from "node:fs/promises";
import sqlite from "node:sqlite";
import path from "path";

import { parse } from "../ext-libs/parse-torrent-title/index.js";

import { IMDB_DATABASE_PATH, MOVIES_JSON, FUZZY_IDS, IMDB_IDS } from "../settings.js";

const DIR = "/mnt/kane/Downloads/# NEW";

let movies = JSON.parse((await fs.readFile(MOVIES_JSON)).toString()) || [];

async function identifyDuplicates() {
    const dirents = await fs.readdir(DIR, { withFileTypes: true });
    for (const dirent of dirents) {
        let re = dirent.name.match(/^(.+) \((.+), (\d{4})\)$/);

        if (re) {
            let title = re[1].trim();
            let release = re[3].trim();

            let dup = movies.find((el) => el.meta.title == title && el.meta.release == release);

            if (dup) {
                console.log("dup", dup.files.location);

                // TODO: change drive letter to regexp looking for resource name
                let drive = "#" + dup.files.location.charAt(0);

                await fs.mkdir(path.join(DIR, drive), { recursive: true });

                await fs.rename(
                    path.join(dirent.parentPath, dirent.name),
                    path.join(dirent.parentPath, drive, dirent.name)
                );
                console.log(path.join(dirent.parentPath, drive, dirent.name));
            }
        }
    }
}

await identifyDuplicates();

export default async function () {
    let db = new sqlite.DatabaseSync(IMDB_DATABASE_PATH);

    const dirents = await fs.readdir(DIR, { withFileTypes: true });

    let stmt = db.prepare(
        `SELECT 
            titles.tconst,
            titles.primaryTitle,
            titles.startYear,
            GROUP_CONCAT(names.primaryName, ', ') AS directors
        FROM titles
        JOIN principals ON titles.tconst = principals.tconst
        JOIN names ON principals.nconst = names.nconst
        WHERE 
            titles.startYear = ?
            AND principals.category = 'director'
            AND (titles.primaryTitleStripped = ? OR titles.originalTitleStripped = ?)
        GROUP BY titles.tconst;`
    );

    for (const dirent of dirents) {
        let re = dirent.name.match(/^(.+) \((.+), (\d{4})\)$/);

        if (re) continue;

        let info = parse(dirent.name);

        if (info.title && info.year) {
            let result = stmt.get(info.year, info.title, info.title);

            if (result) {
                await rename(dirent, result);
            } else {
                let res = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${info.title} ${info.year}.json`);
                if (!res.ok) {
                    console.log("### res", dirent.name);
                    continue;
                }
                let data = await res.json();

                if (!["movie", "short", "video", "tvMovie"].includes(data?.d[0]?.qid)) {
                    console.log("### res", dirent.name);
                    continue;
                }

                let result = db
                    .prepare(
                        `SELECT 
                            titles.tconst,
                            titles.primaryTitle,
                            titles.startYear,
                            GROUP_CONCAT(names.primaryName, ', ') AS directors
                        FROM titles
                        JOIN principals ON titles.tconst = principals.tconst
                        JOIN names ON principals.nconst = names.nconst
                        WHERE 
                            titles.tconst = ?
                            AND principals.category = 'director'
                        GROUP BY titles.tconst;`
                    )
                    .get(data.d[0].id);

                if (result) {
                    console.log(">", dirent.name);
                    console.log("<", result.primaryTitle, result.startYear);
                    console.log("Proceed? [y/n]");

                    if (await interactiveYesNo()) {
                        await rename(dirent, result);
                    }
                } else {
                    console.error("@@@", dirent.name);
                }
            }
        } else {
            console.log("### info", dirent.name);
        }
    }
}

async function rename(dirent, result) {
    result.primaryTitle = result.primaryTitle.replace(":", " -");

    // bail on other illegal characters:
    if (/[\<\>\:\"\/\\\|\?\*]/.test(result.primaryTitle)) {
        console.log("### illegal characters", dirent);
        return;
    }

    let dstFolderName = `${result.primaryTitle} (${result.directors}, ${result.startYear})`;
    let direntPath = path.join(dirent.parentPath, dirent.name);

    if (dirent.isFile()) {
        let dirPath = path.join(DIR, dstFolderName);
        await fs.mkdir(dirPath);

        let dstFilePath = path.join(dirPath, dirent.name);
        await fs.rename(direntPath, dstFilePath);
    } else {
        let dirPath = path.join(DIR, dstFolderName);
        await fs.rename(direntPath, dirPath);
    }
}
import * as readline from "node:readline/promises";

async function interactiveYesNo() {
    const rl = readline.createInterface(process.stdin);

    for await (const line of rl) {
        let val = String(line).trim().toLowerCase();
        if (val == "y") {
            rl.close();
            return true;
        }
        if (val == "n") {
            rl.close();
            return false;
        }
    }
}
