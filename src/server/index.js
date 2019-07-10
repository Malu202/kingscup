const WebSocket = require('ws');
const wss = new WebSocket.Server({
    port: 8080
});

const MINIMUM_ID_LENGTH = 3;
const AUFDECK_DELAY = 5000;
const ANTWORT_TIMEOUT = 5000;

let games = [];

function newGameId() {
    let number = games.length;
    let id = "" + number;
    while (id.length < MINIMUM_ID_LENGTH) {
        id = "0" + id;
    }
}

function generateCards(amountOfDecks) {
    let unshuffledDeck = [];
    for (let i = 0; i < amountOfDecks * 52; i++) {
        unshuffledDeck.push(i);
    }
    let shuffledDeck = [];
    for (let i = 0; i < amountOfDecks * 52; i++) {
        let cardIndex = Math.round((Math.random() * (unshuffledDeck.length - 1)));
        shuffledDeck.push(unshuffledDeck.splice(cardIndex, 1)[0]);
    }
    return shuffledDeck;
}

function zeitenSenden(game) {
    for (let client in game.clients) {
        if (null != client.zeit) {
            client.delay = (+client.zeit - client.sendeZeit) / 2;
        }
        else {
            client.delay = null;
        }
    }
    let delays = clients.filter(v => null != v.delay).map(v => v.delay);
    delays.sort();
    let minimum = delays[0];
    for (let client in game.clients) {
        client.ws.send(JSON.stringify({ type: "kartezeigen", delay: client.delay - minimum }));
    }
    game.aufdeckend = false;
}

wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(message) {
        let command;
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
                let game = games.find(g => g.id === command.id);
                if (null == game) {
                    ws.send(JSON.stringify({ type: "notfound" }));
                }
                else {
                    game.clients.push({ ws: ws, zeit: null });
                    ws.send(JSON.stringify({ type: "joined", karte: game.karte }));
                }
                break;
            case "neu":
                let game = {
                    id: newGameId(),
                    clients: [{ ws: ws, zeit: null }],
                    karte: null,
                    cards: generateCards(command.decks),
                    letztesAufdecken: new Date(),
                    aufdeckend: false
                };
                games.push(game);
                ws.send(JSON.stringify({ type: "created", id: game.id }));
                break;
            case "aufdecken":
                let game = games.find(g => g.id === command.id);
                if (null == game) {
                    ws.send(JSON.stringify({ type: "notfound" }));
                }
                let client = game.clients.find(c => c.ws === ws);
                if (null == client) {
                    console.error("Client war nicht mehr dem Spiel zugeordnet");
                    ws.send(JSON.stringify({ type: "notfound" }));
                }
                let now = new Date();
                if (+now - game.letztesAufdecken < AUFDECK_DELAY) {
                    ws.send(JSON.stringify({ type: "delay" }));
                }
                else {
                    game.letztesAufdecken = now;
                    game.karte = game.cards.pop();
                    game.aufdeckend = true;
                    for (let client of game.clients) {
                        client.zeit = null;
                        client.sendeZeit = new Date();
                        client.ws.send(JSON.stringify({ type: "aufdecken", karte: game.karte }));
                    }
                    setTimeout(ANTWORT_TIMEOUT, function () {
                        if (game.aufdeckend) {
                            zeitenSenden(game);
                        }
                    });
                }
                break;
            case "zeit":
                let game = games.find(g => g.id === command.id);
                if (null == game) {
                    ws.send(JSON.stringify({ type: "notfound" }));
                }
                let client = game.clients.find(c => c.ws === ws);
                if (null == client) {
                    ws.send("Client nicht gefunden!");
                }
                if (!game.aufdeckend) {
                    console.error("Client hat nicht innerhalb von 5 Sekunden geantwortet");
                    ws.send(JSON.stringify({ type: "notfound" }));
                    ws.close();
                    game.clients.splice(game.clients.indexOf(client), 1);
                } else {
                    client.zeit = new Date();
                    if (game.clients.every(c => null != c.zeit)) {
                        zeitenSenden(game);
                    }
                }
                break;
            default:
                ws.send(`Kommando nicht erkannt: ${command.type}`);
                break;
        }
    });
});
