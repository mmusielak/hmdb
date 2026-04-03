import path from "path";

let scripts = [
    "./scripts-v3/03.js",
    //"./scripts-v3/02.js",
    //    "./scripts-v3/01-download-datasets.js"
];

for (let script of scripts) {
    let label = "■ " + path.basename(script);

    console.group(label);
    console.time(label);

    await import(script).then((module) => module.default());

    console.groupEnd();
    console.timeEnd(label);
}

var a = "Piłkarski Poker";
var b = "Pilkarski poker";

function removeDiacritics2(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

import removeDiacritics from "./remove-diacritics.js";

var aa = removeDiacritics(a);
var bb = removeDiacritics(b);
console.log(a == b, aa == bb, aa, bb);

console.log("ł".normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
