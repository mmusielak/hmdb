const fs = require("fs");

const tasks = JSON.parse(node.fs.readFileSync('tasks.json'));
const errors = [];

tasks.forEach(
  (task) => {
    if (fs.existsSync(task[0])) {
      try {
        fs.renameSync(task[0], task[1]);
        // enforce caps
        fs.renameSync(task[1], task[1] + "$");
        fs.renameSync(task[1] + "$", task[1]);
      }
      catch (ex) {
        errors.push(task);
      }

      if (fs.existsSync(task[1])) {
        console.log("✔", task[1]);
      }
      else console.warn("✘ Something went wrong:", taks[0]);
    }
    else console.warn("✘ Could not find:", task[0]);
  }
);

fs.writeFileSync("errors.json", JSON.stringify(errors, null, 2));

console.log("Done!");