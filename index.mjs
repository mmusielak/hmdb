import createCatalogueFromDisk from "./scripts/create-catalogue-from-disk.mjs";
import createCatalogueFromDosList from "./scripts/create-catalogue-from-dos-list.mjs";
import downloadImdbTsv from "./scripts/download-imdb-tsv.mjs";
import buildImdbSql from "./scripts/build-imdb-sql.mjs";
import queryIdsFromImdbSql from "./scripts/query-ids-from-imdb-sql.mjs";
import fetchDetailsFromTmdb from "./scripts/fetch-details-from-tmdb.mjs";

let scripts = [
    {
        run: false,
        label: "■ create movie catalogue from disk",
        function: async () => {
            await createCatalogueFromDosList("local/U.txt", "local/V.txt", "local/X.txt", "local/Y.txt");
        },
    },
    {
        run: false,
        label: "■ create movie catalogue from directory listing",
        function: async () => {
            await createCatalogueFromDisk("\\\\Kane\\X", "\\\\Kane\\Y", "\\\\Kane\\U", "\\\\Kane\\V");
        },
    },
    {
        run: false,
        label: "■ download tables and build imdb sql",
        function: async () => {
            await downloadImdbTsv();
            await buildImdbSql();
        },
    },
    {
        run: false,
        label: "■ query ids from imdb sql",
        function: async () => {
            await queryIdsFromImdbSql();
        },
    },
    {
        run: false,
        label: "■ fetch details from tmdb",
        function: async () => {
            await fetchDetailsFromTmdb(10);
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
