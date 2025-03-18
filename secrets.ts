// # OMDB API
// e094b801
// de9b42e0
// 64a3ff2e
// c8ce5d6f
// 67ede14a
// 7a8960ca
// ec3952e1

// # TMDB v3
// 68138e05feff70f45d99088a3e746b73
// 83506990feb35c4550db7feaee378aef

// # TMDB v4
// eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2ODEzOGUwNWZlZmY3MGY0NWQ5OTA4OGEzZTc0NmI3MyIsInN1YiI6IjU2NWYzY2U4YzNhMzY4NzUxMDAwM2U0NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.1xuuauqobR9IvyoAXPAR4KqwK4LcgMKUQAkYDaWxtwY

const TMDB = ["83506990feb35c4550db7feaee378aef"];
const OMDB = ["e094b801", "de9b42e0", "64a3ff2e", "c8ce5d6f", "67ede14a", "7a8960ca", "ec3952e1"];

let index = 0;

const SECRETS = {
    get TMDB () {
        return TMDB[0];
    },
    get OMDB () {
        return OMDB[index = (index + 1) % OMDB.length];
    }
};

export default SECRETS;