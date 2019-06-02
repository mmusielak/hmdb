
var fs = require("fs");

var db = fs.readFileSync('out/db.json').toString();
var src = fs.readFileSync('src/src.html').toString();

fs.writeFileSync('out/app.html', src.replace('[["DB"]]', db));

