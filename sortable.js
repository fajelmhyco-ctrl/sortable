var musicFolder = "Music/";
var mp3Extension = /\.mp3$/i;
var playlist = [];
var currentTrackIndex = -1;
var dragStartIndex = 0;

var audioPlayer = document.getElementById("audio");
var playlistElement = document.getElementById("playlist");
var titleElement = document.getElementById("title");
var artistElement = document.getElementById("artist");
var coverElement = document.getElementById("cover");
var playButton = document.getElementById("playButton");
var previousButton = document.getElementById("previousButton");
var nextButton = document.getElementById("nextButton");
var seekBar = document.getElementById("seek");
var currentTimeLabel = document.getElementById("currentTime");
var totalTimeLabel = document.getElementById("totalTime");
var trackCountLabel = document.getElementById("trackCount");
var statusElement = document.getElementById("status");

function makeReadableName(fileName) {
    var name = decodeURIComponent(fileName)
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    seconds = Math.max(0, Math.floor(seconds));
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function loadPlaylist() {
    fetch(musicFolder)
        .then(function (r) { return r.text(); })
        .then(function (html) {
            var page = new DOMParser().parseFromString(html, "text/html");
            var links = page.querySelectorAll("a");
            playlist = [];

            for (var i = 0; i < links.length; i++) {
                var link = links[i].getAttribute("href");
                if (link && mp3Extension.test(link)) {
                    var encoded = link.split("/").pop();
                    playlist.push({
                        fileName: decodeURIComponent(encoded),
                        source: musicFolder + encoded,
                        name: makeReadableName(encoded),
                        artist: "Unknown Artist",
                        duration: ""
                    });
                }
            }

            statusElement.textContent = playlist.length === 0 ? "No music found in Music/" : "";
            drawPlaylist();
            loadAllDurations();
        });
}

function drawPlaylist() {
    playlistElement.innerHTML = "";

    for (var i = 0; i < playlist.length; i++) {
        var track = playlist[i];
        var row = document.createElement("li");
        row.className = i === currentTrackIndex ? "track active" : "track";
        row.dataset.index = i;
        row.innerHTML =
            '<span class="handle">⋮⋮</span>' +
            '<div class="meta">' +
            '<div class="name">' + track.name + "</div>" +
            '<div class="sub">' + track.artist + "</div>" +
            "</div>" +
            '<span class="dur">' + (track.duration || "--:--") + "</span>";
        row.addEventListener("click", makeRowClickHandler(i));
        playlistElement.appendChild(row);
    }

    trackCountLabel.textContent = playlist.length + " tracks";
}

function loadAllDurations() {
    playlist.forEach(function (track, index) {
        if (track.duration) return;
        var probe = new Audio();
        probe.preload = "metadata";
        probe.src = track.source;
        probe.addEventListener("loadedmetadata", function () {
            track.duration = formatTime(probe.duration);
            var cell = playlistElement.querySelector('li[data-index="' + index + '"] .dur');
            if (cell) cell.textContent = track.duration;
        });
    });
}

function makeRowClickHandler(index) {
    return function () { playTrack(index); };
}

function playTrack(index) {
    if (!playlist[index]) return;
    currentTrackIndex = index;
    var track = playlist[index];

    titleElement.textContent = track.name;
    artistElement.textContent = track.artist;
    coverElement.textContent = "🎵";
    coverElement.style.background =
        "linear-gradient(135deg, hsl(" + ((index * 67) % 360) + " 60% 45%), #0e0e12)";

    audioPlayer.src = track.source;
    audioPlayer.play();
    drawPlaylist();
}

function togglePlay() {
    if (currentTrackIndex === -1) {
        if (playlist.length > 0) playTrack(0);
        return;
    }
    audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
}

function playNext() {
    if (playlist.length === 0) return;
    playTrack((currentTrackIndex + 1) % playlist.length);
}

function playPrevious() {
    if (playlist.length === 0) return;
    playTrack((currentTrackIndex - 1 + playlist.length) % playlist.length);
}

playButton.addEventListener("click", togglePlay);
nextButton.addEventListener("click", playNext);
previousButton.addEventListener("click", playPrevious);

seekBar.addEventListener("input", function () {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
    }
});

audioPlayer.addEventListener("timeupdate", function () {
    if (!audioPlayer.duration) return;
    seekBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
    totalTimeLabel.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("loadedmetadata", function () {
    if (currentTrackIndex === -1) return;
    playlist[currentTrackIndex].duration = formatTime(audioPlayer.duration);
    var cell = playlistElement.querySelector('li[data-index="' + currentTrackIndex + '"] .dur');
    if (cell) cell.textContent = playlist[currentTrackIndex].duration;
});

audioPlayer.addEventListener("ended", playNext);
audioPlayer.addEventListener("play", function () { playButton.textContent = "❚❚"; });
audioPlayer.addEventListener("pause", function () { playButton.textContent = "▶"; });

$(playlistElement).sortable({
    handle: ".handle",
    axis: "y",
    cursor: "grabbing",
    opacity: 0.6,
    placeholder: "track-placeholder",
    forcePlaceholderSize: true,

    start: function (event, ui) {
        dragStartIndex = ui.item.index();
    },
    update: function (event, ui) {
        var dragEndIndex = ui.item.index();
        if (dragStartIndex === dragEndIndex) return;

        playlist.splice(dragEndIndex, 0, playlist.splice(dragStartIndex, 1)[0]);

        if (currentTrackIndex === dragStartIndex) {
            currentTrackIndex = dragEndIndex;
        } else if (dragStartIndex < currentTrackIndex && dragEndIndex >= currentTrackIndex) {
            currentTrackIndex--;
        } else if (dragStartIndex > currentTrackIndex && dragEndIndex <= currentTrackIndex) {
            currentTrackIndex++;
        }
        drawPlaylist();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.code === "Space" && event.target.tagName !== "INPUT") {
        event.preventDefault();
        togglePlay();
    }
});

loadPlaylist();