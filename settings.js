export const DATASETS = [
    { url: "https://datasets.imdbws.com/name.basics.tsv.gz", table: "person" },
    { url: "https://datasets.imdbws.com/title.akas.tsv.gz", table: "akas" },
    { url: "https://datasets.imdbws.com/title.basics.tsv.gz", table: "title" },
    { url: "https://datasets.imdbws.com/title.crew.tsv.gz", table: "crew" },
    { url: "https://datasets.imdbws.com/title.principals.tsv.gz", table: "principals" },
    { url: "https://datasets.imdbws.com/title.ratings.tsv.gz", table: "ratings" },
];

export const CACHE_FOLDER = "cache/";
export const IMDB_DATABASE_PATH = "cache/imdb.sqlite";

export const MOVIES_JSON = "cache/movies.json";

export const IMDB_IDS = "cache/imdb-ids.json";
export const FUZZY_IDS = "cache/fuzzy-ids.json";
export const TMDB_CACHE = "cache/tmdb-details.json";
export const OMDB_CACHE = "cache/omdb-details.json";

export const DIR_LOCATIONS = ["/mnt/kane/x", "/mnt/kane/y", "/mnt/kane/u", "/mnt/kane/v"];
//["\\\\Kane\\X", "\\\\Kane\\Y", "\\\\Kane\\U", "\\\\Kane\\V"];
export const DIR_LISTINGS = ["local/U.txt", "local/V.txt", "local/X.txt", "local/Y.txt"];

export const PRAGMA_DB_DELETE = 1;
export const PRAGMA_DB_OPTIMIZE = 1;
