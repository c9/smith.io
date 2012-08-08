
const PATH = require("path");
const FS = require("fs");
const SMITH = require("smith");
const ENGINE_IO = require("engine.io");


module.exports = function startup(options, imports, register) {

    var channels = options.channels || {};
    var sources = {
        "client": FS.readFileSync(PATH.join(__dirname, "www", "client.js")),
        "engine.io": FS.readFileSync(require.resolve("engine.io-client/dist/engine.io.js"))
    };

    var prefix = (options.prefix || "/");

    imports.connect.useSession(imports.connect.getModule().router(function(app) {

        // Serve the transport client.
        app.get(prefix + "/client.js", function(req, res) {
            res.writeHead(200, {
                "Content-Type": "application/javascript"
            });
            res.end(sources["client"]);
        });

        // Serve transport dependencies.
        app.get(prefix + "/engine.io.js", function(req, res) {
            res.writeHead(200, {
                "Content-Type": "application/javascript"
            });
            res.end(sources["engine.io"]);
        });
    }));


    var engine = ENGINE_IO.attach(imports.http.getServer(), {
        path: prefix
    });
    engine.on("connection", function (socket) {

        var transport = new SMITH.EngineIoTransport(socket);

        transport.send({hello:"World"});

        transport.on("legacy", function (message) {
            console.log("legacy", message);
        });
        
        transport.on("message", function (message) {
            console.log("message", message);
        })

    });


    register(null, {
        "smith.transport.server": {}
    });
};
