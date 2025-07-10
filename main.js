import dl1 from "./scripts/download-imdb-tsv.js";
import dl2 from "./scripts/download-imdb-tsv2.js";
import unz from "./scripts/unzip-imdb-tsv.js";
import sq1 from "./scripts/build-imdb-sql.js";
import sq2 from "./scripts/build-imdb-sql2.js";

console.time("test");
await sq2();
console.timeEnd("test");
