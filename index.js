import createCatalogueFromDisk from "./scripts/create-catalogue-from-disk.js";
import createCatalogueFromDosList from "./scripts/create-catalogue-from-dos-list.js";
import downloadImdbTsv from "./scripts/download-imdb-tsv.js";
import buildImdbSql from "./scripts/build-imdb-sql.js";
import queryIdsFromImdbSql from "./scripts/query-ids-from-imdb-sql.js";
import fetchDetailsFromTmdb from "./scripts/fetch-details-from-tmdb.js";
import fetchDetailsFromOmdb from "./scripts/fetch-details-from-omdb.js";

let scripts = [
    {
        run: true,
        label: "■ Create movie catalogue from DOS directory listing(s)",
        function: async () => {
            await createCatalogueFromDosList("local/U.txt", "local/V.txt", "local/X.txt", "local/Y.txt");
        },
    },
    {
        run: false,
        label: "■ Create movie catalogue from a drive(s)",
        function: async () => {
            await createCatalogueFromDisk("\\\\Kane\\X", "\\\\Kane\\Y", "\\\\Kane\\U", "\\\\Kane\\V");
        },
    },
    {
        run: true,
        label: "■ Download tables and build IMDB SQL",
        function: async () => {
            await downloadImdbTsv();
            await buildImdbSql();
        },
    },
    {
        run: true,
        label: "■ Query IMDB SQL for IDs",
        function: async () => {
            await queryIdsFromImdbSql();
        },
    },
    {
        run: false,
        label: "■ Fetch movie details from TMDB",
        function: async () => {
            await fetchDetailsFromTmdb();
        },
    },
    {
        run: false,
        label: "■ Fetch movie details from OMDB",
        function: async () => {
            await fetchDetailsFromOmdb();
        },
    },
];

for (let chapter of scripts) {
    if (chapter.run) {
        console.group(chapter.label);
        console.time(chapter.label);

        await chapter.function();

        console.groupEnd();
        console.timeEnd(chapter.label);
    }
}
