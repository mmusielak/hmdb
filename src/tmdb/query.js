const KEY = require("./../../secret.js").TMDB_API_KEY;

const node = {
  http: require("http"),
  https: require("https"),
  fs: require("fs"),
  qs: require("querystring"),
  path: require("path")
};

const LOG_ERRORS = false;

var _cache = load("cache/tmdb/cache.json");
var _error = load("cache/tmdb/error.json");
var _movie = load("cache/tmdb/movie.json");

var list = JSON.parse(node.fs.readFileSync("out/list.json").toString());

function load(location) {
  return node.fs.existsSync(location) && JSON.parse(node.fs.readFileSync(location)) || {});
}
function flush() {
  node.fs.writeFileSync(cacheLocation, JSON.stringify(_cache, null, 2));
  node.fs.writeFileSync(errorLocation, JSON.stringify(_error, null, 2));
  node.fs.writeFileSync(movieLocation, JSON.stringify(_movie, null, 2));
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
  var hash = `${item.meta.title} ${item.meta.directors} ${item.meta.release}`;

  if (_cache[hash]) {
    // console.log('CACHED DATA');
    return read(item, hash, _cache[hash]);
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
  _cache[hash] = res;

  if (res.results.length == 0) {
    if (LOG_ERRORS)
      console.warn("✘", hash);

    _error[hash] = {
      _loc: item.files.location
    };
  }
  else if (res.results.length > 1) {
    if (LOG_ERRORS)
      console.warn(`✘ (${res.results.length})`, hash);

    _error[hash] = {
      _loc: item.files.location,
      _err: "unclear",
      unclear: res.results.map(
        (o) => {
          return {
            id: o.id,
            title: o.title,
            original_title: o.original_title,
            original_language: o.original_language,
            overview: o.overview,
            release_date: o.release_date
          }
        }
      )
    };
  }
  else if (res.results[0].release_date.substr(0, 4) != item.meta.release) {
    if (LOG_ERRORS)
      console.warn("✘ (r)", hash);

    _error[hash] = {
      _loc: item.files.location,
      _err: "r",
      title: res.results[0].title.replace(':', ' -'),
      release: res.results[0].release_date.substr(0, 4)
    };

    return fetchMovieDetails(res.results[0].id, hash);
  }
  else if (res.results[0].title.replace(':', ' -') != item.meta.title) {
    if (LOG_ERRORS)
      console.warn("✘ (t)", hash);

    _error[hash] = {
      _loc: item.files.location,
      _err: "t",
      title: res.results[0].title.replace(':', ' -'),
      release: res.results[0].release_date.substr(0, 4)
    };

    return fetchMovieDetails(res.results[0].id, hash);
  }
  else {
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
function request2(url) {
  return new Promise((resolve, reject) => {
    node.https.get(url, (res) => {
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