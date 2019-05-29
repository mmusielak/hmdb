const zlib = require('zlib');
const gzip = zlib.createGzip();
const fs = require('fs');

const inp = fs.createReadStream('cache/tmdb/movie.json');
const out = fs.createWriteStream('cache/tmdb/movie.gz');

//var deflated = zlib.deflateSync(input).toString('base64');
//var inflated = zlib.inflateSync(new Buffer(deflated, 'base64')).toString();

inp.pipe(gzip).pipe(out);