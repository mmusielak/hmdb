const node = {
  fs: require("fs"),
  path: require("path")
};


var errorLocation = 'cache/tmdb/error.json';
var _error = (
  node.fs.existsSync(errorLocation) && JSON.parse(node.fs.readFileSync(errorLocation)) || {});

function fixDates() {
  Object.entries(_error).filter((o) => o[1]._err == "r").forEach(
    (item) => {
      var npath = item[1]._loc.replace(/^(.+) \((.+), (\d{4})\)$/, (str, $1, $2, $3) => {
        return `${$1} (${$2}, ${item[1].release})`;
      });
      //console.log(item[1]._loc, '>', npath);
      tasks.push([item[1]._loc, npath]);
    }
  );
}

function fixTitles() {
  Object.entries(_error).filter((o) => o[1]._err == "t").forEach(
    (item) => {
      var npath = item[1]._loc.replace(/^(.+\/)(.+) \((.+), (\d{4})\)$/, (str, $1, $2, $3) => {
        return `${$1}${item[1].title} (${$3}, ${item[1].release})`;
      });
      tasks.push([item[1]._loc, npath]);
    }
  )

}

node.fs.writeFileSync("out/unclear.json",
  JSON.stringify(
    Object.entries(_error).filter((o) => o[1]._err == "unclear")
    , null, 2));

var tasks = [];

fixDates();
fixTitles();

node.fs.writeFileSync("out/tasks.json", JSON.stringify(tasks, null, 2));
