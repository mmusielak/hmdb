const fs = require('fs');
const zlib = require('zlib');
const gzip = zlib.createGzip();
const gunzip = zlib.createGunzip();

const json = fs.createReadStream('cache/tmdb/movie.json');
const gz = fs.createWriteStream('cache/tmdb/movie.gz');

//var deflated = zlib.deflateSync(input).toString('base64');
//var inflated = zlib.inflateSync(new Buffer(deflated, 'base64')).toString();

//gz.pipe(gunzip).pipe(json);

function deflate(src, dst) {
  fs.createReadStream(src)
    .pipe(zlib.createDeflate())
    .pipe(fs.createWriteStream(dst));
}

deflate('cache/tmdb/movie.json', 'cache/tmdb/movie.bin');