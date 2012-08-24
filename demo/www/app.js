
require(["transport"], function (TRANSPORT) {

	function connect(options) {

		console.info("[" + options.host + ":" + options.port + "] Connecting");

		TRANSPORT.connect({
			host: options.host,
			port: options.port,
			prefix: "/transport/server"
		}, function(err, connection) {

			if (err) {
				console.error(err);
				return;
			}

			connection.on("connect", function() {
				console.info("[" + options.host + ":" + options.port + "] Connected");
			});
			connection.on("disconnect", function(reason) {
				console.info("[" + options.host + ":" + options.port + "] Disconnected", reason);
				try {
					connection.send("While client disconnected");
				} catch(err) {
					console.info(err);
				}
			});

			connection.on("message", function(message) {
				console.info("[" + options.host + ":" + options.port + "] Relaying message", message);
				connection.send(message);
			});

			connection.on("away", function() {
				console.info("[" + options.host + ":" + options.port + "] Away");
				connection.send("While client away");
			});
			connection.on("back", function() {
				console.info("[" + options.host + ":" + options.port + "] Back");
				connection.send("Client back");
			});

		});
	}

	connect({});

});
