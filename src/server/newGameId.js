const constants = require("./constants");

module.exports = function newGameId(games) {
    var number = games.length;
    var id = "" + number;
    while (id.length < constants.MINIMUM_ID_LENGTH) {
        id = "0" + id;
    }
    return id;
}
