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

module.exports = generateCards;