import * as fs from "node:fs";

if (!fs.existsSync("cache/")) {
    fs.mkdirSync("cache");
}

if (!fs.existsSync("secrets.mjs")) {
    fs.writeFileSync(
        "secrets.mjs",
        `
            throw new Error("Invalid API secrets");
            export const TMDB_SECRET = "DUMMY";
            export const OMDB_SECRET = "DUMMY";
        `.trim()
    );
}
