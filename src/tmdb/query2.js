const KEY = require("./../../secret.js").TMDB_API_KEY;

const node = {
  http: require("http"),
  https: require("https"),
  fs: require("fs"),
  qs: require("querystring")
};

const LOG_ERRORS = true;

var _search = load("cache/tmdb/search.json");
var _error = load("cache/tmdb/error.json");
var _movie = load("cache/tmdb/movie.json");

var list = JSON.parse(node.fs.readFileSync("out/list.json").toString());

function load(location) {
  return node.fs.existsSync(location) && JSON.parse(node.fs.readFileSync(location)) || {};
}
function flush() {
  node.fs.writeFileSync("cache/tmdb/search.json", JSON.stringify(_search, null, 2));
  node.fs.writeFileSync("cache/tmdb/error.json", JSON.stringify(_error, null, 2));
  node.fs.writeFileSync("cache/tmdb/movie.json", JSON.stringify(_movie, null, 2));
}

async function main() {
  for (var i = 0; i < list.length; i++) {
    await process(list[i]);
  }
}

main()
  .then(flush)
  .catch(console.error)

function process(item) {
  var hash = `${item.meta.title} // ${item.meta.directors} // ${item.meta.release}`;

  if (_search[hash]) {
    return;//return read(item, hash, _search[hash]);
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
        return read(item, hash, res);
      })
      .catch((err) => {
        console.error('* http error', err)
      });
  }
}

function read(item, hash, res) {
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

function request(url) {
  return new Promise((resolve, reject) => {
    node.http.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(res.statusCode);
      } else {
        var chunks = "";
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          chunks += (chunk);
        });
        res.on('end', () => {
          var result = JSON.parse(chunks);
          resolve(result);
        });
      }
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function handleUncertainResult(results, item, hash) {
  for (var i = 0; i < results.length; i++) {
    var test = testCase(results[i], item);

    if (test) {
      _search[hash] = {
        id: results[i].id,
        title: results[i].title,
        original_title: results[i].original_title,
        original_language: results[i].original_language,
        overview: results[i].overview,
        release_date: results[i].release_date
      };

      return fetchMovieDetails(results[i].id, hash);
    }
  }

  if (LOG_ERRORS)
    console.warn(`✘ (${results.length})`, hash);


  _error[hash] = {
    _err: "unclear",
    _loc: item.files.location,

    unclear: results.map(
      (o) => {
        return {
          id: o.id,
          title: o.title,
          original_title: o.original_title,
          original_language: o.original_language,
          overview: o.overview,
          release_date: o.release_date.substr(0, 4)
        }
      }
    )
  };
}

var diacratics = require("../core/diacratics.js");

function testCase(result, item, hash) {

  var i_release = Number(item.meta.release)
  var r_release = Number(result.release_date.substr(0, 4));

  var i_title = normalize(item.meta.title);
  var r_title = normalize(result.title);
  var r_title2 = normalize(result.original_title);

  // +/- 2
  if (i_title == r_title || i_title == r_title2) {
    for (var i = 0; i < 5; i++) {
      if (i_release == r_release - 2 + i) {

        if (i != 0) {
          _error[hash] = {
            _loc: item.files.location,
            _err: "r",
            meta: item.meta,
            directors: item.meta.directors,
            title: result.title.replace(':', ' -'),
            release: result.release_date.substr(0, 4)
          };
        }
        return true;
      }
    }
  }

  return false;
}

function normalize(title) {
  var str = diacratics(title).replace(':', ' -').toLowerCase();
}