const newGameId = require("./newGameId");
const constants = require("./constants");
const generateCards = require("./generate-cards");

module.exports = class Games {
    constructor() {
        this.games = [];
        this.join = this.join.bind(this);
        this.getById = this.getById.bind(this);
        this.findClientInGame = this.findClientInGame.bind(this);
        this.create = this.create.bind(this);
        this.aufdecken = this.aufdecken.bind(this);
        this.educatedGuess = this.educatedGuess.bind(this);
        this.aufdeckenOk = this.aufdeckenOk.bind(this);
        this.removeClient = this.removeClient.bind(this);
    }

    removeClient(ws) {
        let game = this.games.find(g => null != this.findClientInGame(g, ws));
        if (game) {
            game.clients = game.clients.filter(c => c.ws != ws);
        }
    }

    getById(id) {
        var game = this.games.find(g => g.id === id)
        if (null == game) {
            throw new Error("Game not found");
        }
        return game;
    }

    educatedGuess(game) {
        let avgTimes = game.clients.map(cl => {
            if (cl.aufdeckRequests.length > 0) {
                let requests = cl.aufdeckRequests.slice(0, Math.max(1, Math.round(cl.aufdeckRequests.length * 0.9)));
                return requests.reduce((pv, cv) => pv + cv, 0) / requests.length;
            }
            return null;
        }).filter(t => null != t);
        if (!avgTimes.length) {
            return +new Date() + 200;
        }
        else {
            avgTimes.sort((a, b) => b - a);
            return +new Date() + avgTimes[0];
        }
    }

    aufdecken(id) {
        let game = this.getById(id);
        if (game.cards.length > 0) {
            if (+new Date() - +game.letztesAufdecken < constants.AUFDECK_DELAY) {
                return {
                    ende: false,
                    delay: true,
                    game: game
                };
            }
            game.karte = game.cards.pop();
            if (game.cards.length > 0) {
                game.naechste = game.cards[game.cards.length - 1];
            }
            game.letztesAufdecken = new Date();
            return {
                ende: false,
                delay: false,
                game: game,
                um: this.educatedGuess(game)
            };
        }
        else {
            return {
                ende: true,
                game: game
            };
        }
    }

    aufdeckenOk(id, requestDauer, ws) {
        let game = this.getById(id);
        let client = this.findClientInGame(game, ws);
        client.aufdeckRequests.push(requestDauer);
        client.aufdeckRequests.sort((a, b) => a - b);
        client.aufdeckRequests = client.aufdeckRequests.slice(0,
            Math.min(client.aufdeckRequests.length, constants.MAX_REQUEST_TIMES));
    }

    findClientInGame(game, ws) {
        return game.clients.find(c => c.ws == ws);
    }

    join(id, ws) {
        var game = this.getById(id);
        var joined = this.findClientInGame(game, ws);
        if (joined) {
            console.warn("already joined");
        }
        else {
            game.clients.push({ ws: ws, aufdeckRequests: [] });
            return game;
        }
    }

    create(decks, ws) {
        var game = {
            id: newGameId(this.games),
            clients: [{ ws: ws, aufdeckRequests: [] }],
            karte: 0,
            cards: generateCards(decks),
            letztesAufdecken: new Date(+new Date() - constants.AUFDECK_DELAY)
        };
        game.naechste = game.cards[game.cards.length - 1]
        this.games.push(game);
        return game;
    }
}