# Home Movie DB

A bunch of scripts for cataloging home movie collection.

## Installation

Run `npm install` and it will create a `cache/` folder as well as `secrets.mjs` - *just make sure to update your API keys afterwards*.

## Usage

Run `npm start` to invoke `index.mjs`.

Before you do, you should check `index.mjs` and make you unlocked scripts you want to run.

## Benchmark

SQL creation takes ~ 10 minutes (6 minutes import and 4 minutes to create indexes and vacuum).
Queries take ~ 3 minutes. LIKE is significantly slower right now.