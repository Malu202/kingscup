const fs = require('fs');
const minimist = require('minimist');
const WebSocket = require('ws');
var https = require('https');

let args = minimist(process.argv.slice(2), {
  default: {
    private : null,
    public: null
  }
});
let opts = {
  port: 33712
};

if (args.private && args.public) {
  console.log("using https");
  let privateKey = fs.readFileSync(args.private, 'utf8');
  let certificate = fs.readFileSync(args.public, 'utf8');
  let httpsServer = https.createServer({key: privateKey, cert:certificate});
  httpsServer.listen(opts.port);
  opts = { server : httpsServer };
}

const wss = new WebSocket.Server(opts);

const MINIMUM_ID_LENGTH = 3;
const AUFDECK_DELAY = 5000;
const ANTWORT_TIMEOUT = 5000;

var games = [];

function newGameId() {
    var number = games.length;
    var id = "" + number;
    while (id.length < MINIMUM_ID_LENGTH) {
        id = "0" + id;
    }
    return id;
}

function generateCards(amountOfDecks) {
    var unshuffledDeck = [];
    for (var j = 0; j < amountOfDecks; j++) {
        for (var i = 1; i < 53; i++) {
            unshuffledDeck.push(i);
        }
    }
    var shuffledDeck = [];
    for (var i = 0; i < amountOfDecks * 52; i++) {
        var cardIndex = Math.round((Math.random() * (unshuffledDeck.length - 1)));
        shuffledDeck.push(unshuffledDeck.splice(cardIndex, 1)[0]);
    }
    return shuffledDeck;
}

function zeitenSenden(game) {
    for (var client of game.clients) {
        if (null != client.zeit) {
            client.delay = (+client.zeit - +client.sendeZeit - client.ladezeit) / 2;
        }
        else {
            client.delay = null;
        }
    }
    var delays = game.clients.filter(v => null != v.delay).map(v => v.delay);
    console.log(delays, maximum);
    delays.sort((a, b) => a - b);
    var maximum = delays[delays.length - 1];
    for (var client of game.clients) {
        if (client.delay != null) {
            client.ws.send(JSON.stringify({
                type: "aufdecken",
                delay: maximum - client.delay,
                naechste: game.cards[game.cards.length - 1]
            }));
        }
    }
    game.clients = game.clients.filter(c => !!c.zeit);
    game.aufdeckend = false;
}

wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(message) {
        var command;
        try {
            command = JSON.parse(message);
        }
        catch {
            command = null;
        }
        if (!command || !command.type) {
            ws.send(`Falsches Format ${message}`);
        }
        switch (command.type) {
            case "join":
                var game = games.find(g => g.id === command.id);
                if (null == game) {
                    ws.send(JSON.stringify({ type: "notfound" }));
                }
                else {
                    var joined = game.clients.find(c => c.ws == ws);
                    if (joined) {
                        console.warn("already joined");
                    }
                    else {
                        game.clients.push({ ws: ws, zeit: null });
                        ws.send(JSON.stringify({
                            type: "joined",
                            karte: game.karte,
                            id: game.id,
                            naechste: game.cards[game.cards.length - 1]
                        }));
                    }
                }
                break;
            case "neu":
                var game = {
                    id: newGameId(),
                    clients: [{ ws: ws, zeit: null }],
                    karte: null,
                    cards: generateCards(command.decks),
                    letztesAufdecken: new Date(+new Date() - AUFDECK_DELAY),
                    aufdeckend: false
                };
                games.push(game);
                ws.send(JSON.stringify({
                    type: "created",
                    id: game.id,
                    naechste: game.cards[game.cards.length - 1]
                }));
                break;
            case "aufdecken":
                var game = games.find(g => g.id === command.id);
                if (null == game) {
                    ws.send(JSON.stringify({ type: "notfound" }));
                } else {
                    var client = game.clients.find(c => c.ws === ws);
                    if (null == client) {
                        console.error("Client war nicht mehr dem Spiel zugeordnet");
                        ws.send(JSON.stringify({ type: "notfound" }));
                    } else {
                        var now = new Date();
                        if (+now - game.letztesAufdecken < AUFDECK_DELAY) {
                            ws.send(JSON.stringify({ type: "delay-error" }));
                        }
                        else {
                            game.letztesAufdecken = now;
                            game.karte = game.cards.pop();
                            game.aufdeckend = true;
                            for (var client of game.clients) {
                                client.zeit = null;
                                client.sendeZeit = new Date();
                                client.ws.send(JSON.stringify({ type: "aufdecken-vorbereiten", karte: game.karte, zeit: +new Date(), id: game.id }));
                            }
                            setTimeout(function () {
                                if (game.aufdeckend) {
                                    zeitenSenden(game);
                                }
                            }, ANTWORT_TIMEOUT);
                        }
                    }
                }
                break;
            case "ready":
                var game = games.find(g => g.id === command.id);
                if (null == game) {
                    ws.send(JSON.stringify({ type: "notfound" }));
                } else {
                    var client = game.clients.find(c => c.ws === ws);
                    if (null == client) {
                        ws.send("Client nicht gefunden!");
                    } else {
                        if (!game.aufdeckend) {
                            console.error("Client hat nicht innerhalb von 5 Sekunden geantwortet");
                            ws.send(JSON.stringify({ type: "notfound" }));
                            ws.close();
                            game.clients.splice(game.clients.indexOf(client), 1);
                        } else {
                            client.zeit = new Date();
                            client.ladezeit = command.ladezeit;
                            if (game.clients.every(c => null != c.zeit)) {
                                zeitenSenden(game);
                            }
                        }
                    }
                }
                break;
            default:
                ws.send(`Kommando nicht erkannt: ${command.type}`);
                break;
        }
    });
});
