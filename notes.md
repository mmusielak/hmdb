# HMDB

Home Movie Database

The idea is that you have a collection of movies in your possesion and you'd like to gather additional data about it.
Preferably, the data that lives in the golden source for all the movie industry, the Internet Movie Database.
Unfortunately you're out of luck because the IMDB is guarding their secrets pretty well.

IMDB is sharing (for non commercial use) some of its data, but that's not enough to build a Plex surrogate.
Fortunately there are others services like TMDB or OMDB that will happily serve you data... only if you have the correct ID.

That's what this collection of script is trying to achieve - based of basic information it tries to match your movies to the IMDB ids and using that fetch information from other resources.

--
TMDB can have different release years from IMDB.
TMDB offers a way to gather movie detail based of its IMDB ID.
IMDB has every single screen piece made on the planet so you have to be very precise with your queries.
IMDB doesn't offer enough data to create an usable Plex alternative.

The `name.basics.tsv` has all the movies with theirs IMDB IDs but also a ton of false positives (other niche movies, TV episodes, etc.)

To wrangle the personal collection you have to (1) identify IMDB IDs of your movies, and (2) gather the data from TMDB based of these IDs.

ADL:
given the nature of the project, all parts of the project are independent scripts, which work from ground up
given the nature of the project, all script are expecting a happy path and there's little to none of error handling
DB: dealing with the data manually is out of the question because you have to deal with relationships between `title` and (`crew` or `priniciapls`) and `person`
DB: lovefield is not suitable for anything 100k+
DB: sqljs (wasm) is not mature enough (2024)
DB: sqlite3-better is still better than sqlite3 but the difference is less pronounced (2024)
IMDB is not enough to build a Plex app (no details, no pictures)
TMDB is having a nice v3 API that provides all neccesary data
OMDB is lacking data compared to TMDB

ADL
config? paths? files? objects?

TODO

1. create-list-from-disk OK
2. create-list-from-dosdir OK
3. dl-imdb-tsv CHECK
4. build-imdb-sql OK

5. imdb-ids TODO
6. query-tmdb (add imdb-ids, double check data)

---

fileName
filePath
directoryPath

benchmark:
dl-imdb-tsv ~ 01:00 @300mbps
build-imdb-sql: 17:00 @300k/s
manual ~ 01:00
readline ~ 00:30
line.split ~ 02:00
line.slice ~ 01:00

    wasm  (`name`)  ~ 02:30
    + pragma        ~ 02:30
    better          ~ 00:45
    sqlite3         ~ 00:45 300k/s

1. create a catalogue of local movies
   1a. run `create-catalogue-from-disk` if you have access to local assets
   1b. run `create-catalogue-from-dos-list` if you have listings created with `dir DISK /s/a/tc > FILE` (vide: `list.bat`)

this will create `cache/dir.json`

2. create a local imdb sql database
   2a. run `dl-imdb-tsv` to download data
   2b. run `build-imdb-sql` to create sql database from tsv files

this will create `cache/imdb.sqlite`

2c. alternatively run `...` to enrich `cache/dir.json` with imdb ids from `cache/title.basics.tsv`

3. fetch movie details from tmdb
   3a. run `query-tmdb` ...

---

chcp 65001
dir u: /s/a/tc > U.txt
dir v: /s/a/tc > V.txt
dir x: /s/a/tc > X.txt
dir y: /s/a/tc > Y.txt

## Benchmarks

For 6,000 entries:

-   `createCatalogueFromDosList` takes around 00:00
-   `createCatalogueFromDisk` takes around 03:00
-   `downloadImdbTsv` downloads approx 1.5Gb and depends entirely on your connection speed
-   `buildImdbSql` takes around 09:00 (~5.5 minutes to import and ~3.5 minutes to clean)
-   `queryIdsFromImdbSql` takes around 02:00
-   `fetchDetailsFromTmdb` takes around 25:00
-   `fetchDetailsFromOmdb` would take around 20:00 but the API is limited to 1000 queries a day
