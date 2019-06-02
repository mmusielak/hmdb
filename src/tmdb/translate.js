const fs = require('fs');
const zlib = require('zlib');

const cfg = {
  dataPath: "out/db.json",
  detailsPath: "cache/tmdb/movie.bin",
  detailsPathRAW: "cache/tmdb/movie.json"
};

var db = load(cfg.detailsPathRAW);

function load(location) {
  return node.fs.existsSync(location) && JSON.parse(node.fs.readFileSync(location)) || {};
}

