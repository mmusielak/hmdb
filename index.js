import path from "path";

let scripts = [
    "./scripts/create-catalogue-from-dos-list.js",
    //"./scripts/create-catalogue-from-disk.js",
    //"./scripts/download-imdb-tsv.js",
    //"./scripts/build-imdb-sql.js",
    //"./scripts/query-ids-from-imdb-sql.js",
    //"./scripts/fetch-details-from-tmdb.js",
    "./scripts/fetch-details-from-omdb.js",
    "./scripts/compile-web-app.js",
];

for (let script of scripts) {
    let label = "■ " + path.basename(script);

    console.group(label);
    console.time(label);

    await import(script).then((module) => module.default());

    console.groupEnd();
    console.timeEnd(label);
}
