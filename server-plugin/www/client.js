
define(function(require, exports, module) {

	var ENGINE_IO = require("./engine.io");
	var SMITH = require("smith");


	var Transport = function(options, connectedCallback) {
		this.options = options;
		this.options.path = this.options.prefix;
		delete this.options.prefix;
		this.connect(connectedCallback);
	}
	Transport.prototype.connect = function(callback) {
		var _self = this;

		// NOTE: `eio` comes from `require("./engine.io");`.
		_self.socket = new eio.Socket(_self.options);
		_self.socket.on("open", function () {

		var transport = new SMITH.EngineIoTransport(_self.socket);

			transport.on("message", function (message) {
				console.log("message", message);
			});

			transport.on("legacy", function (message) {
				console.log("legacy", message);

				transport.send([message]);
			});

			transport.on("disconnect", function (reason) {

				console.log("disconnect", reason);
				console.log("TODO: Reconnect!");

			});
		});
	}
	Transport.prototype.emit = function(channel, message) {

		console.log("Sending", message, "to channel", channel);

	}
	Transport.prototype.on = function(channel, handler) {

		console.log("Registering handler", handler, "for channel", channel);

	}

	var connections = {};
	exports.connect = function(options, callback) {
		if (connections[options.prefix]) {
			return callback(null, connections[options.prefix]);
		}
		connections[options.prefix] = new Transport(options, callback);
	}

});
