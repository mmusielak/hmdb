/*
chcp 65001
dir x: /s/a/tc > foo.txt
*/

const node = {
  fs: require("fs"),
  path: require("path")
};

var list = [].concat(
  node.fs.readFileSync("in/v.txt").toString().split("\r\n"),
  node.fs.readFileSync("in/x.txt").toString().split("\r\n"),
  node.fs.readFileSync("in/y.txt").toString().split("\r\n"));

var entries = [];
var folders = {};

var result;

while (list.length) {
  var line = list.shift();

  if (line == "") {
    continue;
  }
  else if (result = line.match(/^ Directory of (.+)$/)) {
    dir = result[1].replace(/\\/g, '/');

    if (!folders[dir]) {
      folders[dir] = [];
    }

    var info = analyze(dir);

    if (info) {
      var check = entries.find(
        (item) => {
          return item.meta.title == info.meta.title
            && item.meta.release == info.meta.release
        });

      if (check) {
        console.log('DUP', check.files.location, info.files.location);
      }
      else {
        entries.push({
          content: folders[dir],
          ...info
        });
      }
    }
  }
  else if (result = line.match(/^(\d\d\.\d\d.\d\d\d\d  \d\d\:\d\d+)\s+((<DIR>)|([\d\s]+))\s+(.+)$/)) {
    var foo = result;

    var name = foo[5];

    if (name == "." || name == "..") {
      continue;
    }

    if (foo[2] != '<DIR>') {
      folders[dir].push({
        type: 'FILE',
        name: foo[5],
        time: convertDate(foo[1]),
        size: Number(foo[4].replace(/\s/g, "")) // remove whitespace
      });
    } else {
      folders[dir].push({
        type: 'DIR',
        name: foo[5],
        content: folders[dir + '/' + foo[5]] = []
      });
    }
  }
}

node.fs.writeFileSync("out/list.json", JSON.stringify(entries, null, 2));
console.log(entries.length);

function analyze(path) {
  var result = node.path.basename(path).match(/^(.+) \((.+), (\d{4})\)$/);

  return result && {
    files: {
      location: path
    },
    meta: {
      title: result[1],
      directors: result[2],
      release: result[3]
    }
  };
}

function convertDate(dos) {
  return dos.substr(6, 4) + "-"
    + dos.substr(3, 2) + "-"
    + dos.substr(0, 2);
}