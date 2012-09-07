
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs");
const SMITH = require("smith");
const ENGINE_IO = require("engine.io");
const EVENTS = require("events");

// Switch from `away` to `disconnect` after this many milliseconds.
const RECONNECT_TIMEOUT = 60 * 1000;


var engines = [];

function engineForResource(server, resource, options) {
    for (var i=0; i<engines.length; i++) {
        if (engines[i][0] === server && engines[i][1] === resource) {
            return engines[i][2];
        }
    }

    var engine = ENGINE_IO.attach(server, {
        resource: resource,
        pingTimeout: options.pingTimeout || 3000,
        pingInterval: options.pingInterval || 15000
    });

    engine.on("error", function(err) {
        console.error(err.stack);
    });

    engines.push([
        server,
        resource,
        engine
    ]);

    return engine;
}


module.exports = function startup(options, imports, register) {

    if (typeof options.messageRoute === "undefined") {
        options.messageRoute = options.messagePath;
    }

    var gee = new EVENTS.EventEmitter();

    if (options.messageRoute) {

        var connections = {};
        var timeouts = {};
        var buffers = {};

        var engine = engineForResource(imports.http.getServer(), options.messageRoute, options);

        var match = null;
        if (typeof options.messagePath === 'object' && options.messagePath.test) {
            match = function (uri) {
                return options.messagePath.test(uri);
            };
        } else {
            match = function (uri) {
                return options.messagePath == uri.substr(0, options.messagePath.length);
            }
        }

        engine.on("connection", function (socket) {

            if (!match(socket.transport.request.url.substring(ENGINE_IO.URI_PREFIX.length))) {
                return;
            }

            var transport = new SMITH.EngineIoTransport(socket);
            var id = false;

            transport.on("legacy", function (message) {
                if (typeof message === "object" && message.type === "__ANNOUNCE-ID__") {
                    id = message.id;
                    if (timeouts[id]) {
                        clearTimeout(timeouts[id]);
                        delete timeouts[id];
                    }
                    if (!connections[id]) {
                        connections[id] = {
                            ee: new EVENTS.EventEmitter(),
                            transport: transport
                        };
                        gee.emit("connect", {
                            id: id,
                            on: connections[id].ee.on.bind(connections[id].ee),
                            once: connections[id].ee.once.bind(connections[id].ee),
                            send: function(message) {
                                if (timeouts[id]) {
                                    if (!buffers[id]) {
                                        buffers[id] = [];
                                    }
                                    buffers[id].push(message);
                                } else if (connections[id]) {
                                    connections[id].transport.send(message);
                                }
                            }
                        });
                    } else {
                        connections[id].transport = transport;
                        if (buffers[id]) {
                            buffers[id].forEach(function(message) {
                                connections[id].transport.send(message);
                            });
                            delete buffers[id];
                        }
                        connections[id].ee.emit("back");
                    }
                } else if (connections[id]) {
                    connections[id].ee.emit("message", message);
                }
            });

            transport.on("disconnect", function (reason) {
                if (id === false || !connections[id]) {
                    // Connection was never announced so we can just stop here.
                    return;
                }
                timeouts[id] = setTimeout(function() {
                    // the connection might not exist on the server
                    if (connections[id]) {
                        connections[id].ee.emit("disconnect", reason);
                        delete connections[id];
                    }
                    id = false;
                }, RECONNECT_TIMEOUT);
                connections[id].ee.emit("away");
            });

            transport.send({
                type: "__ASSIGN-ID__",
                id: socket.id + "-" + Date.now()
            });
        });
    }

    if (options.clientRoute) {
        imports.connect.useStart(imports.connect.getModule().router(function(app) {
            app.get(options.clientRoute, function(req, res) {
                FS.readFile(PATH.join(__dirname, "www", "client.js"), function(err, data) {
                    res.writeHead(200, {
                        "Content-Type": "application/javascript",
                        "Content-Length": data.length
                    });
                    res.end(data);
                });
            });
        }));
    }

    register(null, {
        "smith.transport.server": {
            "on": gee.on.bind(gee)
        }
    });
};
