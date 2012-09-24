#!/usr/bin/env node

const PATH = require("path");
const ARCHITECT = require("architect");


exports.main = function main(host, port, callback) {

    var plugins = [
        {
            packagePath: "connect-architect/connect",
            host: host,
            port: port
        },
        {
            packagePath: "connect-architect/connect.static",
            prefix: "/static"
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
            messageRoute: /^\/transport\/ser[ver]+/,
            messagePath: "/transport/server"
        },
        {
            provides: [],
            consumes: [
                "smith.transport.server",
                "connect"
            ],
            setup: function(options, imports, register) {

                imports.connect.useStart(imports.connect.getModule().static(PATH.join(__dirname, "www")));

                var TRANSPORT = imports["smith.transport.server"];

                // Fires once for every *new* client connection (not reconnects).
                TRANSPORT.on("connect", function(connection) {

                    console.log("Connected:", connection.id);

                    // Fires once after reconnect attempts have failed and a timeout has passed.
                    connection.once("disconnect", function(reason) {
                        console.log("Disconnected:", connection.id, reason);
                    });

                    connection.on("message", function(message) {
                        console.log("Got message:", message);
                        if (typeof message === "string" && message.indexOf("ping:") === 0) {
                            connection.send("pong: " + message.match(/\d+$/)[0]);
                        }
                    });

                    connection.send({say:"Connected"});

                    connection.on("away", function() {
                        console.log("Away:", connection.id);
                        connection.send({say:"While server away"});
                    });

                    connection.on("back", function() {
                        console.log("Back:", connection.id);
                        connection.send({say:"Server back"});
                    });
                });

                register(null, {});
            }
        }
    ];

    ARCHITECT.createApp(ARCHITECT.resolveConfig(plugins, __dirname), function (err, app) {
        if (err) {
            return callback(err);
        }
        callback(null, app);
    });
}

if (require.main === module) {

    var host = (process.argv.join(" ").match(/-h\s(\S*)/) || ["","localhost"])[1];
    var port = parseInt(process.env.PORT || 8080, 10);

    exports.main(host, port, function(err) {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        }
        // Server should now be running.
    });
}
