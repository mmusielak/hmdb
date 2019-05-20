const BASE_PATH = "http://image.tmdb.org/t/p/original/";

var http = require('http');
var fs = require('fs');

async function dl(url, dest) {
  if (fs.existsSync(dest))
    return Promise.resolve();
  return new Promise(
    (resolve, reject) => {
      var file = fs.createWriteStream(dest);
      http.get(url, (res) => {
        res.pipe(file);
        file.on('finish', () => {
          console.log("✔", dest);
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest);
        console.warn("✘", dest);
        reject(err);
      });
    });
};

var json = JSON.parse(fs.readFileSync('cache/tmdb/movie.json'));
var list = Object.entries(json);

async function main() {
  for (var i = 0; i < list.length; i++) {
    await dl(
      BASE_PATH + list[i][1].backdrop_path,
      "cache/images" + list[i][1].backdrop_path);
    await dl(
      BASE_PATH + list[i][1].poster_path,
      "cache/images" + list[i][1].poster_path);
  }
}

main();

/*
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
*/