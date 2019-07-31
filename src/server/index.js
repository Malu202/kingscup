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
            naechste: game.cards[game.cards.length - 1]
        }));
    } catch (e) {
        ws.send(JSON.stringify({ type: "notfound" }));
    }
}

parser.neu = function (decks, ws) {
    let game = games.create(decks);
    ws.send(JSON.stringify({
        type: "created",
        id: game.id,
        naechste: game.cards[game.cards.length - 1]
    }));
}

parser.aufdecken = function (id, ws) {

}

parser.ready = function (id, ladezeit, ws) {

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
});
