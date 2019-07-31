// var WS_SERVER = "ws://localhost:33712";
var WS_SERVER = "wss://smallvm.westeurope.cloudapp.azure.com:33712";
var IMAGE_DIR = "assets/";
var IMAGE_SUFFIX = ".svg";
var TIMESYNCINTERVAL = 500;
var MAX_TIME_AGE = 3 * 60 * 1000;
var ENTER_KEY = "13";

var pageSwitcher = new PageSwitcher();
document.addEventListener('DOMContentLoaded', function (event) {
    //the event occurred
    pageSwitcher.switchToPage("loginPage");
})

var game = null;
var times = {
    syncRequestTime: null,
    requests: [],
    responses: []
};
function getAdjustedServerTime() {
    if (times.responses && times.responses.length) {
        var delays = times.responses.map(function (r) {
            return Object.assign({}, r);
        });
        delays.sort(function (a, b) { return a.delay - b.delay; });
        // return new Date(delays[0].serverTime + (delays[0].delay / 2) + (+new Date() - delays[0].responseTime));
        console.log("current delay: " + delays[0].delay);
        return new Date(delays[0].serverTime + (delays[0].delay / 2) + performance.now() - delays[0].responseTime);
    }
    return null;
}
var socket = new WebSocket(WS_SERVER);
socket.onopen = function () {
    console.log("connected");
    syncTime();
    // setInterval(function () {
    //     syncTime()
    // }, 5000);
};
socket.onerror = function (error) {
    console.log('WebSocket Error ' + error);
};
var cardLoadPromise = Promise.resolve();
socket.onmessage = function (e) {
    var messageTime = performance.now();
    console.log('Server: ' + e.data);

    var command;
    try {
        command = JSON.parse(e.data);
    }
    catch (e) {
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
            pageSwitcher.switchToPage("gamePage");
            break;
        case "joined":
            // command.karte <- jetzt
            // command.naechste <- preloaden
            game = { id: command.id, karte: command.karte };
            output.innerHTML = "joined " + game.id;
            pageSwitcher.switchToPage("gamePage");
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
            output.innerHTML = "erst nach 5 sekunden wieder!!!";
            setTimeout(function () {
                output.innerHTML = game.id;
            }, 5000);
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
        case "time":
            var res = times.requests[0];
            if (null == res) {
                console.error("no time response found");
            }
            times.requests.splice(times.requests.indexOf(res), 1);
            times.responses.push({
                serverTime: command.time,
                delay: messageTime - res.requestTime,
                requestTime: res.requestTime,
                responseTime: messageTime,
                serverOffset: command.time + ((messageTime - res.requestTime) / 2) - messageTime
            });
            console.log("received delay: " + (messageTime - res.requestTime));
            // times.responses = times.responses.filter(function (r) {
            //     return r.responseTime - performance.now() < MAX_TIME_AGE;
            // });
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
var exit = document.getElementById("exit");

var preloadedImage;
var preloadedImageNumber = null;

function loadCardImage(cardNumber) {
    return new Promise(function (resolve) {
        preloadedImage = document.createElement("img");
        preloadedImage.src = IMAGE_DIR + cardNumber + IMAGE_SUFFIX;
        preloadedImage.style.position = "absolute";
        preloadedImage.style.top = "-9999px";
        preloadedImage.style.left = "-9999px";
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
    // preloadedImage.style.top = "0";
    // preloadedImage.style.left = "0";

    // preloadedImage.style.position = "relative";
    currentImage = preloadedImage;
    currentImage.id = "cardImage";
    preloadedImage.classList.add("aspectRatioHack")
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
gameId.addEventListener("keyup", function (e) {
    if (e.keyCode == ENTER_KEY) {
        var id = gameId.value;
        joinGame(id);
    }
});
getNewCardButton.onclick = function () {
    getANewCard();
}

function getANewCard() {
    socket.send(JSON.stringify({ type: "aufdecken", id: game.id }));
}

exit.onclick = function () {
    refresh();
}

function refresh() {
    window.location.replace(window.location.pathname + window.location.search + window.location.hash);
}

function sendSyncRequest() {
    times.requests.push({ requestTime: performance.now() });
    socket.send(JSON.stringify({ type: "getTime" }));
}

var counter = 0;

function syncTime() {
    times.requests = [];
    sendSyncRequest();
    if (counter < 30) {
        counter++;
        setTimeout(syncTime, TIMESYNCINTERVAL);
    }
}

function logTime() {
    var serverTime = getAdjustedServerTime();
    if (null == serverTime) {
        setTimeout(logTime, 1000);
    }
    else {
        setTimeout(logTime, 1000 - serverTime.getMilliseconds());
        showTime("" + serverTime.getSeconds());
        console.log(serverTime);
    }
}
logTime();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", {
        scope: "./"
    }).
        then((serviceWorker) => {
            console.log("service worker registration successful");
        })
        .catch((err) => {
            console.error("service worker registration failed");
        });
} else {
    console.log('service worker unavailable');
}



var raphiLog ="";
function showTime(time) {
    output.innerHTML = raphiLog + time;
}

function focus() {
    raphiLog += "f\n";
}
function blur(){
    raphiLog += "b\n";
}
window.addEventListener("focus", focus);
document.addEventListener("focus", focus);
window.addEventListener("blur", blur);
document.addEventListener("blur", blur);