var WS_SERVER = "ws://localhost:8080";
var IMAGE_DIR = "assets/";
var IMAGE_SUFFIX = ".svg";

var game = null;
var socket = new WebSocket(WS_SERVER);
socket.onopen = function () {
    console.log("connected");
};
socket.onerror = function (error) {
    console.log('WebSocket Error ' + error);
};
socket.onmessage = function (e) {
    var messageTime = new Date();
    console.log('Server: ' + e.data);

    var command;
    try {
        command = JSON.parse(e.data);
    }
    catch {
        command = null;
    }
    if (!command || !command.type) {
        console.error("Falsches Format " + e.data);
    }
    switch (command.type) {
        case "created":
            game = { id: command.id, karte: null };
            output.innerHTML = "created " + game.id;
            break;
        case "joined":
            game = { id: command.id, karte: command.karte };
            output.innerHTML = "created " + game.id;
            if (null != game.karte) {
                loadCardImage(game.karte, function () {
                    showCard();
                });
            }
            break;
        case "notfound":
            game = null;
            alert("notfound");
            break;
        case "delay-error":
            alert("erst nach 5 sekunden wieder!!!");
            break;
        case "aufdecken-vorbereiten":
            if (command.id != game.id) {
                console.warn("aufdecken für falsches spiel erhalten, nicht antworten");
            } else {
                // command.karte
                // command.zeit <- serverzeit
                console.log("ich bereite " + command.karte + " vor, aber pschhhhhht");

                loadCardImage(command.karte, function () {
                    var delay = +new Date() - messageTime;
                    socket.send(JSON.stringify({ type: "ready", ladezeit: delay, id: game.id }));
                });
            }
            break;
        case "aufdecken":
            console.log("wird ent-versteckt");
            setTimeout(showCard, command.delay);
            break;
        default:
            console.error("Falsches Kommando: " + command.type);
            break;
    }
};

function joinGame(id) {
    socket.send(JSON.stringify({ type: "join", id: id }));
}

function createGame() {
    socket.send(JSON.stringify({ type: "neu", decks: 2 }));
}

var nextCard;

var output = document.getElementById("output");
var createGameButton = document.getElementById("createGame");
var joinGameButton = document.getElementById("joinGame");
var gameId = document.getElementById("gameId");
var getNewCardButton = document.getElementById("getNewCard");
var cardImageViewer = document.getElementById("cardImage");
var imageContainer = document.getElementById("imageContainer");

var preloadedImage;

function loadCardImage(cardNumber, callback) {
    preloadedImage = document.createElement("img");
    preloadedImage.src = IMAGE_DIR + cardNumber + IMAGE_SUFFIX;
    preloadedImage.style.position = "absolute";
    preloadedImage.style.top = "250px";
    preloadedImage.style.left = "250px";
    console.log("request load " + preloadedImage.src);
    var listener = preloadedImage.addEventListener('load', function () {
        preloadedImage.removeEventListener('load', listener);
        console.log("loaded " + preloadedImage.src);
        callback();
    });
    imageContainer.append(preloadedImage);
}

var currentImage = null;
function showCard() {
    if (null != currentImage) {
        imageContainer.removeChild(currentImage);
    }
    preloadedImage.style.top = "0";
    preloadedImage.style.left = "0";
    preloadedImage.style.position = "relative";
    currentImage = preloadedImage;
    currentImage.onclick = function () {
        getANewCard();
    }
}

createGameButton.onclick = function () {
    createGame();
}
joinGameButton.onclick = function () {
    var id = gameId.value;
    joinGame(id);
}
getNewCardButton.onclick = function () {
    getANewCard();
}

function getANewCard() {
    socket.send(JSON.stringify({ type: "aufdecken", id: game.id }));
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", {
        scope: "./"
    })
        .then((serviceWorker) => {
            console.log("service worker registration successful");
        })
        .catch((err) => {
            console.error("service worker registration failed");
        });
} else {
    console.log('service worker unavailable');
}