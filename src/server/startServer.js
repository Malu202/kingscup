const fs = require('fs');
const minimist = require('minimist');
const WebSocket = require('ws');
const https = require('https');

module.exports = function startServer() {

    let args = minimist(process.argv.slice(2), {
        default: {
            private: null,
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
        let httpsServer = https.createServer({ key: privateKey, cert: certificate });
        httpsServer.listen(opts.port);
        opts = { server: httpsServer };
    }

    return new WebSocket.Server(opts);
}
