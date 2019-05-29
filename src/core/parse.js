const node = {
  os: require("os"),
  fs: require("fs"),
  path: require("path")
};

var list = [].concat(
  node.fs.readFileSync("in/v.txt").toString().split(node.os.EOL),
  node.fs.readFileSync("in/x.txt").toString().split(node.os.EOL),
  node.fs.readFileSync("in/y.txt").toString().split(node.os.EOL));

console.log('>', list.length);

var entries = [];
var dir;
var current;

while (list.length) {
  var re, line = list.shift();

  if (line == "") {
    continue;
  }
  else if (re = line.match(/^ Directory of (.+)$/)) {

    dir = re[1].replace(/\\/g, '/');
    var info = analyze(dir);

    if (info) {
      current = info;

      var check = entries.find(
        (item) => {
          return item.meta.title == info.meta.title
            && item.meta.release == info.meta.release
        });

      if (check) {
        console.warn('[DUP]', check.files.location, info.files.location);
      }
      else {
        entries.push(info);
      }
    }
  }
  else if (current && dir.startsWith(current.files.location)) {
    if (re = line.match(/^(\d\d\.\d\d.\d\d\d\d  \d\d\:\d\d)([\d\s]{18}) (.+)$/)) {
      current.files.content.push({
        name: (dir + '/' + re[3]).substr(current.files.location.length + 1),
        time: convertDate(re[1]),
        size: Number(re[2].replace(/\s/g, "")) // remove whitespace
      });
    }
  }
}

node.fs.writeFileSync("out/list.json", JSON.stringify(entries, null, 2));
console.log('<', entries.length);

function analyze(path) {
  var result = node.path.basename(path).match(/^(.+) \((.+), (\d{4})\)$/);

  return result && {
    files: {
      content: [],
      location: path
    },
    meta: {
      title: result[1].trim(),
      directors: result[2].trim(),
      release: result[3].trim()
    }
  };
}

function convertDate(dos) {
  return `${dos.substr(6, 4)}-${dos.substr(3, 2)}-${dos.substr(0, 2)}`;
}