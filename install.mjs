import * as fs from "node:fs";

if (!fs.existsSync("cache/")) {
    fs.mkdirSync("cache");
}

if (!fs.existsSync("secrets.mjs")) {
    fs.writeFileSync(
        "secrets.mjs",
        `
            throw new Error("Invalid API secrets");
            const SECRETS = {
                TMDB: "",
                OMDB: "",
            };
            export default SECRETS;
        `.trim()
    );
}
