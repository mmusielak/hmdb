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
-   `buildImdbSql` takes around 20 minutes to produce a clean database with indexes (1.4Gb)
-   `queryIdsFromImdbSql` takes around 00:15
-   `fetchDetailsFromTmdb` takes around 35:00
-   `fetchDetailsFromOmdb` takes around 25:00

---

⏱: 8:43.383 (m:ss.mmm) import tsv files
⏱: 13:30.189 (m:ss.mmm) delete non-movie entries
⏱: 18:52.402 (m:ss.mmm) delete orphaned entries
⏱: 19:23.934 (m:ss.mmm) create indexes
⏱: 19:24.038 (m:ss.mmm) optimize
⏱: 20:26.173 (m:ss.mmm) vacuum

ADL:
why recreating the database?

-   on hdd 'insert or replace' drags the performance to a halt; on ssd it's slightly slower
-   we have to import all the data anyway (we're skipping tv shows and adult movies) because checking data per insert is really slow
-   there's no way to resume the process (at least right now)

---

explain query plan SELECT title.tconst FROM title
JOIN principals ON title.tconst = principals.tconst
JOIN person ON principals.nconst = person.nconst
WHERE
(title.primaryTitle COLLATE NOCASE = :arg2 OR title.originalTitle COLLATE NOCASE = :arg2)  
AND person.primaryName COLLATE NOCASE = :arg1  
AND principals.category = 'director'
AND title.startYear = :arg0

5 0 0 SEARCH person USING COVERING INDEX idx_person_primary (primaryName=?)
13 0 0 MULTI-INDEX OR
14 13 0 INDEX 1
25 14 0 SEARCH title USING INDEX idx_title_primary (primaryTitle=?)
31 13 0 INDEX 2
42 31 0 SEARCH title USING INDEX idx_title_original (originalTitle=?)
54 0 0 SEARCH principals USING INDEX idx_principals_tconst_category (tconst=? AND category=?)

---

name.basics.tsv
name.basics.tsv: 1:03.475 (m:ss.mmm)
name.basics.tsv: 14,317,997 lines
title.basics.tsv
title.basics.tsv: 1:07.219 (m:ss.mmm)
title.basics.tsv: 11,574,371 lines
title.principals.tsv
title.principals.tsv: 5:50.053 (m:ss.mmm)
title.principals.tsv: 91,871,340 lines
title.ratings.tsv
title.ratings.tsv: 3.863s
title.ratings.tsv: 1,555,343 lines
title.crew.tsv
title.crew.tsv: 35.014s
title.crew.tsv: 11,572,118 lines
clean
clean: 4:53.162 (m:ss.mmm) delete title
clean: 12:16.430 (m:ss.mmm) delete orphans
clean: 14:13.100 (m:ss.mmm) optimize
clean: 16:29.295 (m:ss.mmm) vacuum
clean: 16:29.297 (m:ss.mmm)

---

explain query plan DELETE FROM crew WHERE crew.tconst NOT IN (SELECT title.tconst FROM title)
