
require(["smith.io"], function (TRANSPORT) {

	console.info("Connecting");

	TRANSPORT.connect({
		prefix: "/transport/server"
	}, function(err, connection) {

		if (err) {
			console.error(err);
			return;
		}

		var pingInterval = null;

		connection.on("connect", function() {
			console.info("Connected");

			var index = 0; 
			pingInterval = setInterval(function() {
				index += 1;
				console.log("Send", "ping: " + index);
				connection.send("ping: " + index)
			}, 1000);
		});
		connection.on("disconnect", function(reason) {
			clearInterval(pingInterval);
			console.info("Disconnected", reason);
			try {
				connection.send("While client disconnected");
			} catch(err) {
				console.info(err);
			}
		});

		connection.on("message", function(message) {
            if (typeof message === "string" && message.indexOf("pong:") === 0) {
				console.log("Received", message);
            } else {
				console.info("Relaying message", message);
				connection.send(message);
            }
		});

		connection.on("away", function() {
			console.info("Away");
			connection.send("While client away");
		});
		connection.on("back", function() {
			console.info("Back");
			connection.send("Client back");
		});

	});

});
