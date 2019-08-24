var WS_SERVER = "ws://localhost:33712";
// var WS_SERVER = "wss://smallvm.westeurope.cloudapp.azure.com:33712";
var IMAGE_DIR = "assets/";
var IMAGE_SUFFIX = ".svg";
var ENTER_KEY = "13";


var pageSwitcher = new PageSwitcher();

document.addEventListener('DOMContentLoaded', function (event) {
    pageSwitcher.switchToPage("loginPage");
});

var game = null;
var socket = null;
var cardLoadPromise = Promise.resolve();

var timeSyncher = new TimeSyncher(function () {
    if (socket && socket.readyState == socket.OPEN) {
        socket.send(JSON.stringify({
            type: "getTime"
        }));
        return true;
    }
    return false;
}, function () {
    console.error("timeout");
}, function (synched) {
    if (synched) {
        if (pageSwitcher.previousPageName == "loginPage") {
            return;
        } else if (pageSwitcher.previousPageName == "loadScreen") {
            pageSwitcher.switchToPage("gamePage");
        }
    } else if (pageSwitcher.previousPageName == "gamePage") {
        pageSwitcher.switchToPage("loadScreen");
    }
});


function initializeGame(command) {
    game = {
        id: command.id,
        karte: command.karte
    };
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
}

function connect() {
    socket = new WebSocket(WS_SERVER);
    socket.onopen = function () {
        console.log("connected");
        timeSyncher.setUnsynchronized();
        if (null !== game) {
            joinGame(game.id);
        }
    };
    socket.onerror = function (error) {
        console.log('WebSocket Error ' + error);
        socket.close();
    };
    socket.onclose = function (e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function () {
            connect();
        }, 1000);
    }
    socket.onmessage = function (e) {
        var messageTime = performance.now();
        var serverTime = timeSyncher.getAdjustedServerTime();
        // console.log('Server: ' + e.data);

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
            case "joined":
                initializeGame(command);
                break;
            case "notfound":
                game = null;
                pageSwitcher.switchToPage("loginPage");
                break;
            case "delay-error":
                output.innerHTML = "erst nach 5 sekunden wieder!!!";
                setTimeout(function () {
                    output.innerHTML = game.id;
                }, 5000);
                break;
            case "aufdecken":
                var timeout = serverTime > command.um ? 0 : command.um - serverTime;
                setTimeout(function () {
                    console.log("wird ent-versteckt");
                    showCard();
                    console.log("ich bereite " + command.naechste + " vor, aber pschhhhhht");
                    cardLoadPromise = loadCardImage(command.naechste);
                }, timeout);
                console.log("aufdeck-delay: " + timeout);
                var requestDauer = serverTime - command.zeit;
                socket.send(JSON.stringify({
                    type: "aufdecken-ok",
                    id: game.id,
                    requestDauer: requestDauer
                }));
                break;
            case "time":
                timeSyncher.addSyncResponse(command.time, messageTime);
                break;
            default:
                console.error("Falsches Kommando: " + command.type);
                break;
        }
    };
}
connect();

function joinGame(id) {
    socket.send(JSON.stringify({
        type: "join", id: id
    }));
}

function createGame() {
    socket.send(JSON.stringify({
        type: "neu", decks: 2
    }));
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
        imageContainer.appendChild(preloadedImage);
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
    preloadedImage.classList.add("aspectRatioHack");
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
    socket.send(JSON.stringify({
        type: "aufdecken", id: game.id
    }));
}

exit.onclick = function () {
    refresh();
}

function refresh() {
    window.location.replace(window.location.pathname + window.location.search + window.location.hash);
}


function logTime() {
    var serverTime = timeSyncher.getAdjustedServerTime();
    if (null == serverTime) {
        setTimeout(logTime, 1000);
    }
    else {
        serverTime = new Date(serverTime);
        setTimeout(logTime, 1000 - serverTime.getMilliseconds());
        showTime("" + serverTime.getSeconds());
    }
}
logTime();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", {
        scope: "./"
    }).then(function serviceWorker() {
        console.log("service worker registration successful");
    }).catch(function error(err) {
        console.error("service worker registration failed");
    });
} else {
    console.log('service worker unavailable');
}

var raphiLog = "";

function showTime(time) {
    output.innerHTML = raphiLog + time;

    // if (time <= 52) {
    //     // loadCardImage(time);
    //     // showCard();
    // }
}

function focus() {
    console.log("fh");
    timeSyncher.setUnsynchronized();
}

function blur() {
    console.log("bh");
    timeSyncher.abortSync();
}

window.addEventListener("focus", focus);
document.addEventListener("focus", focus);
window.addEventListener("blur", blur);
document.addEventListener("blur", blur);
