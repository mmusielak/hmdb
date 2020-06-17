const API_KEY;
const ERRORS;
const WARNINGS;

const request = require('../request.js');

let cache = {
  search: readJson("cache/tmdb/search.json"),
  error: readJson("cache/tmdb/error.json"),
  movie: readJson("cache/tmdb/movie.json"),
};

/* in */ var list = readJson("out/list.json");
/* out */ var out = [];

/* export */

async function main() {
  for (var i = 0; i < list.length; i++) {
    await search(list[i]);
    translate(list[i]);
  }
}

// --- main logic --- //

function search(item) {
  var hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

  if (_search[hash]) {
    return //process(item, hash, _search[hash]);
  }
  else {
    var qs = node.qs.stringify({
      api_key: KEY,
      query: item.meta.title,//remove_diacratics(title),
      year: item.meta.release
    });

    var url = `http://api.themoviedb.org/3/search/movie?${qs}`;

    return request(url)
      .then((res) => {
        return process(item, hash, res);
      })
      .catch((err) => {
        console.error('* http error', err)
      });
  }
}

function process(item, hash, res) {
  if (res.results.length == 0) {
    if (LOG_ERRORS)
      console.warn("✘", hash);

    _error[hash] = {
      _err: "unknown",
      _loc: item.files.location
    };
  }
  else if (res.results.length > 1) {
    return handleUncertainResult(res.results, item, hash);
  }
  else if (res.results[0].release_date.substr(0, 4) != item.meta.release) {
    if (LOG_ERRORS)
      console.warn("✘ (r)", hash);

    _error[hash] = {
      _loc: item.files.location,
      _err: "r",
      meta: item.meta,
      directors: item.meta.directors,
      title: res.results[0].title.replace(':', ' -'),
      release: res.results[0].release_date.substr(0, 4)
    };

    return fetchMovieDetails(res.results[0].id, hash);
  }
  else if (res.results[0].title.replace(':', ' -').toLowerCase() != item.meta.title.toLowerCase() &&
    res.results[0].original_title.replace(':', ' -').toLowerCase() != item.meta.title.toLowerCase()) {
    if (LOG_ERRORS)
      console.warn("✘ (t)", hash);

    _search[hash] = {
      id: res.results[0].id,
      title: res.results[0].title,
      original_title: res.results[0].original_title,
      original_language: res.results[0].original_language,
      overview: res.results[0].overview,
      release_date: res.results[0].release_date.substr(0, 4)
    };
    _error[hash] = {
      _loc: item.files.location,
      _err: "t",
      directors: item.meta.directors,
      title: res.results[0].title.replace(':', ' -'),
      release: res.results[0].release_date.substr(0, 4)
    };

    return fetchMovieDetails(res.results[0].id, hash);
  }
  else {
    _search[hash] = {
      id: res.results[0].id,
      title: res.results[0].title,
      original_title: res.results[0].original_title,
      original_language: res.results[0].original_language,
      overview: res.results[0].overview,
      release_date: res.results[0].release_date.substr(0, 4)
    }

    return fetchMovieDetails(res.results[0].id, hash);
  }
}

function fetchMovieDetails(id, hash) {
  if (_movie[id])
    return;

  var qs = node.qs.stringify({
    api_key: KEY,
    append_to_response: 'alternative_titles,credits,translations,external_ids'
  });

  var url = `http://api.themoviedb.org/3/movie/${id}?${qs}`;

  return request(url)
    .then((entry) => {
      _movie[id] = entry;
      console.log("✔ *", hash);

    })
    .catch((err) => {
      console.warn("✘ *", hash);
    });
}

// --- misc utils --- //

function readJson(location) {
  return node.fs.existsSync(location) && JSON.parse(node.fs.readFileSync(location)) || {};
}
function writeJson(location, content) {
  node.fs.writeFileSync(location, JSON.stringify(content, null, 2));
}

function flush() {
  writeJson("out/db.json", out);

  writeJson("cache/tmdb/search.json", cache.search);
  writeJson("cache/tmdb/error.json", cache.error);
  writeJson("cache/tmdb/movie.json", cache.movie);
}