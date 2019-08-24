const constants = require("./constants");

const startServer = require("./startServer");
const commandParser = require("./commandParser");
const Games = require("./games");

let wss = startServer();

let parser = new commandParser();

parser.commandError = function (err, ws) {
    ws.send(`Ungueltiges Kommando ${err}`);
}

let games = new Games();

parser.join = function (id, ws) {
    try {
        let game = games.join(id, ws);
        ws.send(JSON.stringify({
            type: "joined",
            karte: game.karte,
            id: game.id,
            naechste: game.naechste,
            kings: game.kings
        }));
    } catch (e) {
        ws.send(JSON.stringify({ type: "notfound" }));
    }
}

parser.neu = function (decks, ws) {
    let game = games.create(decks, ws);
    ws.send(JSON.stringify({
        type: "created",
        id: game.id,
        naechste: game.naechste,
        karte: game.karte,
        kings: game.kings
    }));
}

parser.aufdecken = function (id, ws) {
    try {
        let result = games.aufdecken(id);
        if (result.ende) {
            // TODO
        }
        else if (result.delay) {
            // TODO
        }
        else {
            for (let client of result.game.clients) {
                client.ws.send(JSON.stringify({
                    type: "aufdecken",
                    karte: result.game.karte,
                    naechste: result.game.naechste,
                    kings: result.game.kings,
                    zeit: +new Date(),
                    um: Math.round(result.um)
                }));
            }
        }
    } catch (e) {
        ws.send(JSON.stringify({ type: "notfound" }));
    }
}

parser.aufdeckenOk = function (id, requestDauer, ws) {
    try {
        games.aufdeckenOk(id, requestDauer, ws);
    } catch (e) {
        ws.send(JSON.stringify({ type: "notfound" }));
    }
}

parser.getTime = function (ws) {
    ws.send(JSON.stringify({
        type: "time",
        time: +new Date()
    }));
}

wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(message) {
        parser.onMessage(message, ws);
    });
    ws.on("error", function (msg) {
        console.error("ws error", msg);
        games.removeClient(ws);
    });
    ws.on("close", function () {
        console.log("ws closed");
        games.removeClient(ws);
    });
});
