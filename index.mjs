import createCatalogueFromDisk from "./scripts/create-catalogue-from-disk.mjs";
import createCatalogueFromDosList from "./scripts/create-catalogue-from-dos-list.mjs";
import downloadImdbTsv from "./scripts/download-imdb-tsv.mjs";
import buildImdbSql from "./scripts/build-imdb-sql.mjs";
import queryIdsFromImdbSql from "./scripts/query-ids-from-imdb-sql.mjs";
import fetchDetailsFromTmdb from "./scripts/fetch-details-from-tmdb.mjs";
import fetchDetailsFromOmdb from "./scripts/fetch-details-from-omdb.mjs";

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
        run: 0,
        label: "■ Download tables and build IMDB SQL",
        function: async () => {
            await downloadImdbTsv();
            await buildImdbSql();
        },
    },
    {
        run: 1,
        label: "■ Query IMDB SQL for IDs",
        function: async () => {
            await queryIdsFromImdbSql();
        },
    },
    {
        run: 1,
        label: "■ Fetch movie details from TMDB",
        function: async () => {
            await fetchDetailsFromTmdb();
        },
    },
    {
        run: true,
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
