#!/usr/bin/env node

const PATH = require("path");
const ARCHITECT = require("architect");

function startServer(port) {

    var plugins = [
        {
            packagePath: "connect-architect/connect",
            port: port
        },
        {
            packagePath: "connect-architect/connect.session",
            key: "connect.architect." + port,
            secret: "1234"
        },
        {
            packagePath: "connect-architect/connect.session.memory"
        },
        {
            packagePath: "architect/plugins/architect.log"
        },
        {
            packagePath: "./../server-plugin",
            clientRoute: "/transport/client.js",
            messageRoute: "/transport/server"
        },
        {
            provides: [],
            consumes: [
                "smith.transport.server",
                "connect"
            ],
            setup: function(options, imports, register) {

                imports.connect.useStart(imports.connect.getModule().router(function(app) {
                    app.get(/^(\/engine.io.js)$/, function(req, res) {
                        req.url = req.params[0];
                        imports.connect.getModule().static(PATH.join(require.resolve("engine.io-client"), "../..", "dist"))(req, res);
                    });
                }));

                imports.connect.useStart(imports.connect.getModule().static(PATH.join(__dirname, "www")));

                var TRANSPORT = imports["smith.transport.server"];

                // Fires once for every *new* client connection (not reconnects).
                TRANSPORT.on("connect", function(connection) {

                    console.log("[port: " + port + "] Connected:", connection.id);

                    // Fires once after reconnect attempts have failed and a timeout has passed.
                    connection.once("disconnect", function(reason) {
                        console.log("[port: " + port + "] Disconnected:", connection.id, reason);
                    });

                    connection.on("message", function(message) {
                        console.log("[port: " + port + "] Got message:", message);
                    });

                    connection.send({say:"Connected"});

                    connection.on("away", function() {
                        console.log("[port: " + port + "] Away:", connection.id);
                        connection.send({say:"While server away"});
                    });

                    connection.on("back", function() {
                        console.log("[port: " + port + "] Back:", connection.id);
                        connection.send({say:"Server back"});
                    });
                });

                register(null, {});
            }
        }
    ];

    ARCHITECT.createApp(ARCHITECT.resolveConfig(plugins, __dirname), function (err, app) {
        if (err) {
            console.error("While starting!");
            throw err;
        }
        console.log("Started!");
    });
}

var port = parseInt(process.env.PORT || 8080, 10);
startServer(port);
