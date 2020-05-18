# Home Movie Database

A set of node scripts to build a catalogue of personal movie collection.

## Model

jj

## Usage

#### #1 directory listing

On Windows machine you run:
```dos
chcp 65001
dir <DRIVE> /s/a/tc > list.txt
```

Then you parse the list:
```dos
node src/core/parse.js
```

This will parse the listings and produce a `out/list.json` file.
The file will contain a list of movies based on the `analyze` function that takes movie metadata based on naming convention of folders.

### #2 details fetching

```dos
node src/tmdb/query.js
```

Takes `out/list.json` file and queries TMDb for movie details.
Interim responses are storied in cache files:
 - `cache/tmdb/error.json`
 - `cache/tmdb/search.json`
 - `cache/tmdb/movies.json`

The final combined list of movies containing all movie details is stored at `out/list.json`.

### #3 app compling

The frontend application source is stored in `src/src.html` and is complied with:

```dos
node build.js
```

This produces `out/app.html` which is a standalone application containing an embedded movie database.hO

### Additional tools

https://v2.sg.media-imdb.com/suggestion/t/<query>.json
