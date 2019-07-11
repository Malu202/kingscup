// var WS_SERVER = "ws://localhost:33712";
var WS_SERVER = "ws://smallvm.westeurope.cloudapp.azure.com:33712";
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
var cardLoadPromise = Promise.resolve();
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
            // command.karte <- null
            // command.naechste <- preloaden
            game = { id: command.id, karte: null };
            output.innerHTML = "created " + game.id;
            cardLoadPromise = loadCardImage(command.naechste);
            break;
        case "joined":
            // command.karte <- jetzt
            // command.naechste <- preloaden
            game = { id: command.id, karte: command.karte };
            output.innerHTML = "created " + game.id;
            function loadNaechste() {
                cardLoadPromise = loadCardImage(command.naechste);
            }
            if (null != game.karte) {
                loadCardImage(game.karte).then(function () {
                    showCard();
                    loadNaechste();
                });
            }
            else {
                loadNaechste();
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
                console.log("ich bereite aufdecken von " + command.karte + " vor, aber pschhhhhht");

                cardLoadPromise.then(function (number) {
                    if (number != command.karte) {
                        console.error("falsche karte preloaded");
                    } else {
                        var delay = +new Date() - messageTime;
                        socket.send(JSON.stringify({ type: "ready", ladezeit: delay, id: game.id }));
                    }
                });
            }
            break;
        case "aufdecken":
            // command.naechste
            setTimeout(function () {
                console.log("wird ent-versteckt");
                showCard();
                console.log("ich bereite " + command.naechste + " vor, aber pschhhhhht");
                cardLoadPromise = loadCardImage(command.naechste);
            }, command.delay);
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
var preloadedImageNumber = null;

function loadCardImage(cardNumber) {
    return new Promise(function (resolve) {
        preloadedImage = document.createElement("img");
        preloadedImage.src = IMAGE_DIR + cardNumber + IMAGE_SUFFIX;
        preloadedImage.style.position = "absolute";
        preloadedImage.style.top = "250px";
        preloadedImage.style.left = "250px";
        console.log("request load " + preloadedImage.src);
        var listener = preloadedImage.addEventListener('load', function () {
            preloadedImage.removeEventListener('load', listener);
            preloadedImageNumber = cardNumber;
            console.log("loaded " + preloadedImage.src);
            resolve(cardNumber);
        });
        imageContainer.append(preloadedImage);
    });
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