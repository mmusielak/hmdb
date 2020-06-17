const http = require("http");
const https = require("https");

export function request(url) {
  return new Promise((resolve, reject) => {
    (url.startsWith("https") ? https : http)
    .get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(res.statusCode);
      } else {
        var chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          chunks += (chunk);
        });
        res.on("end", () => {
          resolve(chunks);
        });
      }
    })
    .on("error", (error) => {
      reject(error);
    });
  });
}