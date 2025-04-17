var results = document.querySelector("#results");

var bindings = {
    genre: document.querySelector("#genre"),
    nav: {
        search: document.querySelector("#search"),
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

var ENG = 0;
var FRESH = 0;
var SUPERB = 0;
var SELECTED;

document.querySelector("#btnEng").addEventListener("click", () => {
    ENG = ENG == 0 ? 1 : 0;
    document.querySelector("#btnEng").classList.toggle("selected");
    invalidate();
});

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

document.querySelector("#search").addEventListener("input", (event) => {
    onInput(event.target.value);
});

var debounce = (fn, delay = 1000) => {
    let timerId = null;
    return (...args) => {
        clearTimeout(timerId);
        timerId = setTimeout(() => fn(...args), delay);
    };
};

var onInput = debounce(invalidate, 500);

window.addEventListener("keydown", (event) => {
    if (event.keyCode == 13) {
        invalidate();
    }
});

var genres = {};
db.forEach((movie) => movie.genres && movie.genres.forEach((g) => (genres[g] = true)));

for (var k in genres) {
    var option = document.createElement("option");

    option.value = k;
    option.innerText = k;

    option.addEventListener(
        "change",
        (e) => {
            console.log(1, k);
            invalidate();
        },
        false
    );

    bindings.genre.appendChild(option);
}

function invalidate() {
    var time = new Date();

    var local = db.slice();
    var search = bindings.nav.search.value.trim().toLowerCase();

    // genres
    if (bindings.genre.selectedIndex != 0) {
        var genre = Object.keys(genres)[bindings.genre.selectedIndex - 1];
        console.log(bindings.genre.selectedIndex, genre);
        local = local.filter((movie) => movie.genres.length == 0 || movie.genres.includes(genre));
        //      (movie) => movie.genre.length == 0 || movie.genre.some((genre) => genres[genre]));
    }

    if (search) {
        local = local.filter(
            (movie) =>
                str_includes(movie.title, search) ||
                str_includes(movie.originalTitle, search) ||
                arr_includes(movie.actors, search) ||
                arr_includes(movie.directors, search) ||
                arr_includes(movie.writers, search)
        );
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

    if (ENG) {
        local = local.filter((movie) => movie.languages.length == 0 || movie.languages.includes("English"));
    }

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
    results.innerHTML = local.slice(0, 1000).reduce((acc, movie, index) => {
        let feat = !SUPERB && movie.rating.imdb >= 80 ? "featured" : "";
        return (
            acc +
            //`<div onclick="showMovieDetails('${movie.external.imdb}')"> ${movie.title}, ${movie.release}</div> `
            //`<div class="movie-item ${feat}" onclick="showMovieDetails('${movie.external.imdb}')"><img loading="lazy" src="${movie.poster}" class="movie-poster" /></div>`
            `
            <div class="movie-item ${feat}" 
     onclick="showMovieDetails('${movie.external.imdb}')">
    <img src="${movie.poster}" class="movie-poster">
    <div class="movie-overlay">
        <div class="overlay-top">
            <span>${movie.release}</span>
            <span>${movie.rating.imdb / 10} | ${movie.rating.rotten}</span>
        </div>
        <div class="overlay-bottom">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-info">
                <div>Dir: ${movie.directors[0]}</div>
                <div>${movie.actors.slice(0, 3).join(", ")}</div>
            </div>
        </div>
    </div>
</div>`
        );
    }, "");

    console.log(`${local.length} of ${db.length} in ${new Date() - time}ms.`);
}

function showMovieDetails(id) {
    if (SELECTED == id) {
        SELECTED = null;
    } else {
        SELECTED = id;

        var movie = db.find((movie) => movie.external.imdb == id);

        bindings.details.title.innerHTML = movie.title;
        bindings.details.alternative.innerHTML = movie.originalTitle;
        bindings.details.genre.innerHTML = movie.genres.join(", ");
        bindings.details.rating.innerHTML = movie.rating.imdb / 10 + " | " + movie.rating.rotten;
        bindings.details.release.innerHTML = movie.release; //.substr(0, 4);
        bindings.details.overview.innerHTML = movie.overview;
        bindings.details.directors.innerHTML = formatNames(movie.directors);
        bindings.details.writers.innerHTML = formatNames(movie.writers);
        bindings.details.actors.innerHTML = formatNames(movie.actors);
        bindings.details.location.innerHTML = movie.local.location;
        bindings.details.size.innerHTML = formatFileSize(movie.local.size);
        bindings.details.imdb.innerHTML = `<a href="https://www.imdb.com/title/${movie.external.imdb}">IMDB</a>`;
        //bindings.details.poster.src = movie.poster;
    }
}

function str_includes(a, b) {
    a = removeDiacritics(a);
    b = removeDiacritics(b);
    return a.toLowerCase().includes(b.toLowerCase());
}
function arr_includes(arr, str) {
    str = str.toLowerCase();
    str = removeDiacritics(str);
    return arr.some((candidate) => removeDiacritics(candidate.toLowerCase()).includes(str));
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
    bindings.nav.search.value = name;
    bindings.genre.selectedIndex = 0;
    invalidate();
}

invalidate();
