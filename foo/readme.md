# Home Movie DB (HMDB)

A collection of scripts for cataloging home movie collection.

## IMDB Datasets

Main reason to use datasets is to correctly identify movies by their IMDB ID (tconst).
Mind that SQLite does not have a native NOACCENT collation so we'll normalize strings by removing accents on inserts.
For that all we need is

-   `name.basics`:
    -   `nconst` (parse to int))
    -   `primaryName` (remove diacritics)
-   `title.basics`:
    -   `tconst` (parse to int)
    -   `primaryTitle` (remove diacritics)
    -   `originalTitle` (remove diacritics)
    -   `startYear`
-   `title.akas`:
    -   `tconst` (parse to int)
    -   `title` (remove diacritics)
-   `title.principals`:
    -   `tconst` (parse to int)
    -   `nconst` (parse to int)
    -   `category` (eg. 'director')

Optionally we could use:

-   `title.ratings`:
    -   `tconst`
    -   `averageRating`

On import we transform `nconst` and `tconst` to integers, so we can use them as primary keys in SQLite database.

## ADL

Considerations for SQLite database:

Parallel writes are not possible, so we need to import data in single thread.
(process could be paralelized by importing each table to a separate databases and use ATTACH to join them later)

For IMPORT we use following pragmas:

```sql
pragma journal_mode = off;
pragma synchronous = off;
pragma temp_store = memory;
```

At the end we call VACUUM and OPTIMIZE to reclaim space and optimize the database. (ANALYZE will be called automatically with OPTIMIZE).

Previously we imported all data from IMDB datasets and then prune unnecessary records.
Now, since we only need a small subset of data, we can start by actively filtering `title` data and creating a hashmap with `tconsts` to later add relecant `akas`, `principals`, and `ratings`. Finally we add only relevant `name` data based on another hashmap with `nconsts`.

Reference:
https://fractaledmind.github.io/2023/09/07/enhancing-rails-sqlite-fine-tuning/
https://phiresky.github.io/blog/2020/sqlite-performance-tuning/
https://blog.devart.com/increasing-sqlite-performance.html
