# Home Movie Database

A set of node scripts to build a catalogue of personal movie collection.

## Model

## Usage

#### #1 directory listing

On Windows machine you run:
```dos
chcp 65001
dir <DRIVE> /s/a/tc > list.txt
```

Then you parse the list:
```dos
node src/core/parse.js
```

This will produce a `out/list.json` file.

