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
    }

    getById(id) {
        var game = this.games.find(g => g.id === id)
        if (null == game) {
            throw new Error("Game not found");
        }
        return game;
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
            game.clients.push({ ws: ws, zeit: null });
            return game;
        }
    }

    create(decks, ws) {
        var game = {
            id: newGameId(this.games),
            clients: [{ ws: ws, zeit: null }],
            karte: null,
            cards: generateCards(decks),
            letztesAufdecken: new Date(+new Date() - constants.AUFDECK_DELAY),
            aufdeckend: false
        };
        this.games.push(game);
        return game;
    }
}