var el = document.querySelector("#results");

var bindings = {
    genre: document.querySelector("#genre"),
    nav: {
        title: document.querySelector("#title"),
        person: document.querySelector("#person"),
    },
    details: {
        title: document.querySelector("#\\:title"),
        alternative: document.querySelector("#\\:alternative"),
        genre: document.querySelector("#\\:genre"),
        rating: document.querySelector("#\\:rating"),
        release: document.querySelector("#\\:release"),
        overview: document.querySelector("#\\:overview"),
        directors: document.querySelector("#\\:directors"),
        writers: document.querySelector("#\\:writers"),
        actors: document.querySelector("#\\:actors"),
        location: document.querySelector("#\\:location"),
        size: document.querySelector("#\\:size"),
        imdb: document.querySelector("#\\:imdb"),
        poster: document.querySelector("#\\:poster"),
    },
};

document.querySelector("#btnFresh").addEventListener("click", () => {
    FRESH = FRESH == 0 ? 1 : 0;
    document.querySelector("#btnFresh").classList.toggle("selected");
    invalidate();
});
document.querySelector("#btnSuperb").addEventListener("click", () => {
    document.querySelector("#btnSuperb").classList.toggle("selected");
    SUPERB = SUPERB == 0 ? 1 : 0;
    invalidate();
});

var FRESH = 0;
var SUPERB = 0;

addEventListener("keydown", (event) => {
    if (event.keyCode == 13) {
        invalidate();
    }
});

var genres = {};
db.forEach((movie) => movie.genres && movie.genres.forEach((g) => (genres[g] = true)));

for (var k in genres) {
    console.log(k);
}

Object.keys(genres).forEach((value) => {
    var option = document.createElement("option");

    option.value = value;
    option.innerText = value;

    option.addEventListener(
        "change",
        (e) => {
            console.log(1, value);
            invalidate();
        },
        false
    );

    bindings.genre.appendChild(option);
});

function invalidate() {
    var time = new Date();

    var local = db.slice();
    var title = bindings.nav.title.value.trim().toLowerCase();
    var person; // = bindings.nav.person.value.trim().toLowerCase();

    // genres
    if (bindings.genre.selectedIndex != 0) {
        var genre = Object.keys(genres)[bindings.genre.selectedIndex - 1];
        console.log(bindings.genre.selectedIndex, genre);
        local = local.filter((movie) => movie.genres.length == 0 || movie.genres.includes(genre));
        //      (movie) => movie.genre.length == 0 || movie.genre.some((genre) => genres[genre]));
    }

    if (title) {
        local = local.filter((movie) => str_includes(movie.title, title) || str_includes(movie.originalTitle, title));
    }
    if (person) {
        local = local.filter(
            (movie) =>
                arr_includes(movie.actors, person) ||
                arr_includes(movie.directors, person) ||
                arr_includes(movie.writers, person)
        );
        //movie.actors.some((name) => str_includes(name, person)) ||
        //movie.directors.some((name) => str_includes(name, person)) ||
        //movie.writers.some((name) => str_includes(name, person)));
    }

    //local = local.sort((a, b) => a.title.localeCompare(b.title));

    local = local.sort((a, b) => {
        var adate = new Date(a.local.date);
        var bdate = new Date(b.local.date);

        if (adate == bdate) {
            return a.title.localeCompare(b.title);
        } else if (adate > bdate) return -1;
        else if (adate < bdate) return 1;
    });

    if (FRESH) {
        local = local.sort((a, b) => {
            var adate = new Date(a.release);
            var bdate = new Date(b.release);

            if (adate == bdate) {
                return a.title.localeCompare(b.title);
            } else if (adate > bdate) return -1;
            else if (adate < bdate) return 1;
        });
    }

    if (SUPERB) {
        local = local.filter((movie) => movie.rating.imdb >= 70);
    }

    // benchmark time taken...
    el.innerHTML = local.slice(0, 1000).reduce((acc, movie, index) => {
        let feat = !SUPERB && movie.rating.imdb >= 80 ? "featured" : "";
        return (
            acc +
            //`<div onclick="showMovieDetails('${movie.external.imdb}')"> ${movie.title}, ${movie.release}</div> `
            `<div class="movie-item ${feat}" onclick="showMovieDetails('${movie.external.imdb}')"><img loading="lazy" src="${movie.poster}" class="movie-poster" /></div>`
        );
    }, "");

    console.log(`${local.length} of ${db.length} in ${new Date() - time}ms.`);
}

function showMovieDetails(id) {
    var movie = db.find((movie) => movie.external.imdb == id);

    bindings.details.title.innerHTML = movie.title;
    bindings.details.alternative.innerHTML = movie.originalTitle;
    bindings.details.genre.innerHTML = movie.genres.join(", ");
    bindings.details.rating.innerHTML = movie.rating.imdb;
    bindings.details.release.innerHTML = movie.release; //.substr(0, 4);
    bindings.details.overview.innerHTML = movie.overview;
    bindings.details.directors.innerHTML = formatNames(movie.directors);
    bindings.details.writers.innerHTML = formatNames(movie.writers);
    bindings.details.actors.innerHTML = formatNames(movie.actors);
    bindings.details.location.innerHTML = movie.local.location;
    bindings.details.size.innerHTML = formatFileSize(movie.local.size);
    bindings.details.imdb.innerHTML = `<a href="https://www.imdb.com/title/${movie.external.imdb}">IMDB</a>`;
    bindings.details.poster.src = movie.poster;
}

function str_includes(a, b) {
    return a.toLowerCase().includes(b.toLowerCase());
}
function arr_includes(arr, str) {
    str = str.toLowerCase();
    return arr.some((candidate) => candidate.toLowerCase().includes(str));
}
function formatFileSize(bytes) {
    var index = 0;
    var suffix = ["", "KB", "MB", "TB", "GB"];

    while ((bytes /= 1000) > 1) {
        index++;
    }

    return Math.floor(bytes * 1000) + suffix[index];
}

function formatNames(list) {
    return list.map((name) => `<a onclick = "searchName('${name}')"> ${name}</a>`).join(", ");
}
function searchName(name) {
    bindings.nav.title.value = "";
    bindings.nav.person.value = name;
    bindings.genre.selectedIndex = 0;
    invalidate();
}

invalidate();
