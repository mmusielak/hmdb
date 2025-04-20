import path from "path";

let scripts = [
    {
        run: true,
        script: "./scripts/create-catalogue-from-dos-list.js",
    },
    {
        run: false,
        script: "./scripts/create-catalogue-from-disk.js",
    },
    {
        run: true,
        script: "./scripts/download-imdb-tsv.js",
    },
    {
        run: true,
        script: "./scripts/build-imdb-sql.js",
    },
    {
        run: true,
        script: "./scripts/query-ids-from-imdb-sql.js",
    },
    {
        run: true,
        script: "./scripts/fetch-details-from-tmdb.js",
    },
    {
        run: true,
        script: "./scripts/fetch-details-from-omdb.js",
    },
];

for (let chapter of scripts) {
    if (chapter.run) {
        let label = "■ " + path.basename(chapter.script);

        console.group(label);
        console.time(label);

        await import(chapter.script).then((module) => module.default());

        console.groupEnd();
        console.timeEnd(label);
    }
}
