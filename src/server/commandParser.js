module.exports = class CommandParser {
    constructor() {
        this.onMessage = this.onMessage.bind(this);
    }
    onMessage(message, ws) {
        var command;
        try {
            command = JSON.parse(message);
        }
        catch {
            command = null;
        }
        if (!command || !command.type) {
            this.commandError(message, ws);
        }
        switch (command.type) {
            case "join":
                if (undefined != command.id) {
                    this.join(command.id, ws);
                    break;
                }
            case "neu":
                if (undefined != command.decks) {
                    this.neu(command.decks, ws);
                    break;
                }
            case "aufdecken":
                if (undefined != command.id) {
                    this.aufdecken(command.id, ws);
                    break;
                }
            case "aufdecken-ok":
                if (undefined != command.id) {
                    this.aufdeckenOk(command.id, command.requestDauer, ws);
                    break;
                }
            case "getTime":
                this.getTime(ws);
                break;
            default:
                this.commandError(command, ws);
                break;
        }
    }
};
