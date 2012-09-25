
define(function(require, exports, module) {

	require("engine.io");
	var ENGINE_IO = eio;	// NOTE: `eio` is a global! See `npm info engine.io-client`.
	var SMITH = require("smith");
	var EVENTS = require("smith/events-amd");

	var transports = [];
	var debugHandler = null;

	function inherits(Child, Parent) {
	    Child.prototype = Object.create(Parent.prototype, { constructor: { value: Child }});
	}

	var Transport = function(options) {
		this.options = options;
		this.options.host = this.options.host || document.location.hostname;
		if (this.options.port === 443) {
			this.options.secure = true;
		}
		this.options.port = this.options.port || document.location.port;
		this.options.path = "";
		this.options.resource = this.options.prefix.replace(/^\/|\/$/g, "");
		delete this.options.prefix;
		this.id = false;
		this.connected = false;
		this.away = false;
		this.buffer = false;
	}
    
	inherits(Transport, EVENTS.EventEmitter);

	Transport.prototype.getUri = function() {
		return "http" + ((this.options.secure)?"s":"") + "://" + 
			   this.options.host + 
			   ((this.options.port)?":"+this.options.port:"") +
			   this.options.path +
			   this.options.resource;
	}

	Transport.prototype.connect = function(options, callback) {
		var _self = this;

		try {

			var connecting = true;

			_self.socket = new ENGINE_IO.Socket(_self.options);

			_self.socket.on("error", function (err) {
				// Only relay first connection error.
				if (connecting === true) {
					connecting = false;
					callback(err);
				}
			});

			_self.socket.on("heartbeat", function () {
				_self.emit("heartbeat");
			});

			_self.socket.on("open", function () {

				connecting = false;

				_self.transport = new SMITH.EngineIoTransport(_self.socket);

				_self.transport.on("legacy", function (message) {
		            if (typeof message === "object" && message.type === "__ASSIGN-ID__") {
		            	if (_self.id === false) {
			            	_self.id = message.id;
			            }
			            _self.transport.send({
			            	type: "__ANNOUNCE-ID__",
			            	id: _self.id
			            });
			            _self.away = false;
			            _self.connected = true;
			            if (options.fireConnect !== false) {
							_self.emit("connect", _self);
						}
						else if (options.reconnectAttempt > 0) {
							_self.emit("back");
						}
						options.reconnectAttempt = 0;
						if (_self.buffer) {
							_self.buffer.forEach(function(message) {
								_self.transport.send(message);
							});
							_self.buffer = false;
						}
		            } else {
						_self.emit("message", message);
		            }
				});

				_self.transport.on("disconnect", function (reason) {

					_self.away = true;
					_self.emit("away");

					function connect() {

						options.reconnectAttempt += 1;

						if (options.reconnectAttempt === 6) {
							_self.away = false;
				            _self.connected = false;
							_self.emit("disconnect", reason);
						}

						var delay = 250;
						if (options.reconnectAttempt > 10) {
							delay = 15 * 1000;
						}
						else if (options.reconnectAttempt > 5) {
							delay = 5 * 1000;
						}
						else if (options.reconnectAttempt > 3) {
							delay = 1 * 1000;
						}

						setTimeout(function() {

							_self.emit("reconnect", options.reconnectAttempt);

							_self.connect({
								reconnectAttempt: options.reconnectAttempt,
								fireConnect: (options.reconnectAttempt >= 6) ? true : false
							}, function(err) {
								if (err) {
									connect();
									return;
								}
							});
						}, delay);
					}
					connect();
				});
				callback(null, _self);
			});

		} catch(err) {
			callback(err);
		}
	}
	Transport.prototype.send = function(message) {
		if (this.connected === false) {
			throw new Error("Cannot send message while disconnected!");
		}
		else if(this.away === true) {
			if (!this.buffer) {
				this.buffer = [];
			}
			this.buffer.push(message);
		}
		this.transport.send(message);
	}

	exports.connect = function(options, callback) {
		var transport = new Transport(options, callback);
		transports.push(transport);
		if (debugHandler) {
			debugHandler.hookTransport(transport);
		}
		transport.connect({}, callback);
		return transport;
	}

	exports.setDebug = function(debug) {
		if (debugHandler !== null) {
			if (debug) return;
			return debugHandler.stop();
		} else if (!debug) return;
		debugHandler = {
			transports: [],
			handlers: [],
			start: function() {
				transports.forEach(debugHandler.hookTransport);
			},
			stop: function() {
				transports.forEach(debugHandler.unhookTransport);
				debugHandler = null;
			},
			hookTransport: function(transport) {
				var index = debugHandler.transports.indexOf(transport);
				if (index !== -1) return;

				console.log("[smith.io:" + transport.getUri() + "] Hook debugger");

				var listeners = {};

				transport.on("connect", listeners["connect"] = function() {
					console.log("[smith.io:" + transport.getUri() + "] Connect");
				});
				transport.on("reconnect", listeners["reconnect"] = function(attempt) {
					console.log("[smith.io:" + transport.getUri() + "] Reconnect: " + attempt);
				});
				transport.on("disconnect", listeners["disconnect"] = function(reason) {
					console.log("[smith.io:" + transport.getUri() + "] Disconnect: " + reason);
				});
				transport.on("heartbeat", listeners["heartbeat"] = function(message) {
					console.log("[smith.io:" + transport.getUri() + "] Heartbeat");
				});
				transport.on("message", listeners["message"] = function(message) {
					console.log("[smith.io:" + transport.getUri() + "] Message", message);
				});
				transport.on("away", listeners["away"] = function() {
					console.log("[smith.io:" + transport.getUri() + "] Away");
				});
				transport.on("back", listeners["back"] = function() {
					console.log("[smith.io:" + transport.getUri() + "] Back");
				});

				debugHandler.transports.push(transport);
				debugHandler.handlers.push({
					unhook: function() {
						console.log("[smith.io:" + transport.getUri() + "] Unhook debugger");
						for (var type in listeners) {
							transport.removeListener(type, listeners[type]);
						}
					}
				});
			},
			unhookTransport: function(transport) {
				var index = debugHandler.transports.indexOf(transport);
				if (index === -1) return;
				debugHandler.transports.splice(index, 1);
				debugHandler.handlers[index].unhook();
				debugHandler.handlers.splice(index, 1);
			}
		};
		debugHandler.start();
	}

});
