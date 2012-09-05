
define(function(require, exports, module) {

	var ENGINE_IO = eio;	// NOTE: `eio` is a global! See `npm info engine.io-client`.
	var SMITH = require("smith");
	var EVENTS = require("events");


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
		this.options.path = this.options.prefix;
		delete this.options.prefix;
		this.id = false;
		this.connected = false;
		this.away = false;
		this.buffer = false;
	}
    
	inherits(Transport, EVENTS.EventEmitter);
    
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
		transport.connect({}, callback);
		return transport;
	}

});
