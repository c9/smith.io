
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
        path: "",
        resource: resource,
        pingTimeout: options.pingTimeout || 3000,
        pingInterval: options.pingInterval || 15000,
        pongPayload: options.pongPayload
//        transports: ["polling"]
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

        var serverId = "server-id-" + Date.now();
        var connections = {};
        var timeouts = {};
        var buffers = {};

        var server = imports.http.getServer();
        options.pongPayload = {
            serverId: serverId
        };
        var engine = engineForResource(server, options.messageRoute, options);

        //failFirstRequest(server);

        var match = null;
        if (typeof options.messagePath === 'object' && options.messagePath.test) {
            match = function (uri) {
                return options.messagePath.test(uri);
            };
        } else if (typeof options.messagePath === 'string') {
            match = function (uri) {
                return options.messagePath == uri.substr(0, options.messagePath.length);
            }
        }

        engine.on("connection", function (socket) {

            if (match && !match(socket.transport.request.url)) {
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
                id: socket.id + "-" + Date.now(),
                serverId: serverId
            });
        });
    }

    if (options.registerClientRoutes !== false) {

        imports.static.addStatics([{
            path: PATH.dirname(require.resolve("engine.io/node_modules/engine.io-client/dist/engine.io.js")),
            mount: "/engine.io",
            rjs: [
                {
                    "name": "engine.io",
                    "location": "engine.io",
                    "main": "engine.io" + ((options.debug)?"-dev":"") + ".js"
                }
            ]
        }]);

        imports.static.addStatics([{
            path: PATH.join(__dirname, "www"),
            mount: "/smith.io",
            rjs: [
                {
                    "name": "smith.io",
                    "location": "smith.io",
                    "main": "client.js"
                }
            ]
        }]);

        imports.static.addStatics([{
            path: PATH.dirname(require.resolve("smith")),
            mount: "/smith",
            rjs: [
                {
                    "name": "smith",
                    "location": "smith",
                    "main": "smith.js"
                }
            ]
        }]);

        imports.static.addStatics([{
            path: PATH.dirname(require.resolve("msgpack-js-browser")),
            mount: "/msgpack-js",
            rjs: [
                {
                    "name": "msgpack-js",
                    "location": "msgpack-js",
                    "main": "msgpack.js"
                }
            ]
        }]);
    }

    register(null, {
        "smith.transport.server": {
            "on": gee.on.bind(gee)
        }
    });
};


// Used to test re-connect when connect request fails.
function failFirstRequest(server) {
    var listeners = server.listeners("request"),
        existingListeners = [];
    for (var i = 0, l = listeners.length; i < l; i++) {
        existingListeners[i] = listeners[i];
    }
    server.removeAllListeners("request");
    server.on("request", function (req, res) {
        var fireExisting = true;
        if (/^\/transport\/server\//.test(req.url)) {
            fireExisting = onTransportRequest(req, res);
        }
        if (fireExisting) {
            for (var i = 0, l = existingListeners.length; i < l; i++) {
                existingListeners[i].call(server, req, res);
            }
        }
    });

    var count = 0;
    function onTransportRequest(req, res) {
        count += 1;
        console.log("REQUEST", req.url, count);
        if (count === 1) {
            console.log("  Fail request");
            res.end("<An unparsable response>");
            return false;
        }
        return true;
    }
}
