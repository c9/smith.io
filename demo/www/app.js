
require(["transport/client"], function (TRANSPORT_CLIENT) {

	console.log("Connecting");

	TRANSPORT_CLIENT.connect({
		host: "localhost",
		port: 8080,
		prefix: "/transport/server"
	}, function(err, transport) {

		console.log("Connected");

		transport.on("channel1", function(data) {
			console.log("Channel 1 message", data);
			transport.emit("channel1", data);
		});
		transport.on("channel2", function(data) {
			console.log("Channel 2 message", data);
			transport.emit("channel2", data);
		});

	});

});
