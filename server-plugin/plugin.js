
const PATH = require("path");
const FS = require("fs");
const SMITH = require("smith");
const ENGINE_IO = require("engine.io");
const EVENTS = require("events");

const RECONNECT_TIMEOUT = 60 * 1000;


module.exports = function startup(options, imports, register) {

    var gee = new EVENTS.EventEmitter();

    if (options.messageRoute) {

        var connections = {};
        var timeouts = {};
        var buffers = {};

        var engine = ENGINE_IO.attach(imports.http.getServer(), {
            path: options.messageRoute
        });
        engine.on("connection", function (socket) {

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
                                } else {
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
                    connections[id].ee.emit("disconnect", reason);
                    delete connections[id];
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
