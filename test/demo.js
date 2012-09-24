
const ASSERT = require("assert");
const DEMO_SERVER = require("../demo/server");
const SPAWN = require("child_process").spawn;


exports.main = function (callback) {

	var port = parseInt(process.env.PORT || 8080, 10);

	DEMO_SERVER.main("localhost", port, function(err, app) {
		if (err) return callback(err);


		var messages = [];

		var TRANSPORT = app.getService("smith.transport.server");

        TRANSPORT.on("connect", function(connection) {

            messages.push("Connected");

            // Fires once after reconnect attempts have failed and a timeout has passed.
            connection.once("disconnect", function(reason) {
                messages.push(["Disconnected:", reason].join(" "));
            });

            connection.on("message", function(message) {
                messages.push(["Got message:", JSON.stringify(message)].join(" "));
            });

            connection.on("away", function() {
                messages.push("Away");
            });

            connection.on("back", function() {
                messages.push("Back");
            });
        });

        console.log("Running `./demo-ui.js` via phantomjs.");

	    var proc = SPAWN("phantomjs", [
	    	"demo-ui.js",
	    	port
	    ], {
	    	cwd: __dirname
	    });

	    proc.on("error", function(err) {
	    	callback(err);
	    });
	    
	    var buffer = [];
	    proc.stdout.on("data", function(data) {
	    	buffer.push(data.toString());
	        process.stdout.write(data.toString());
	    });
	    proc.stderr.on("data", function(data) {
	    	buffer.push(data.toString());
	        process.stderr.write(data.toString());
	    });
	    proc.on("exit", function(code) {
	        if (code !== 0) {
	            callback(new Error("Did not get `status === 0`!"));
	            return;
	        }
	        else if (/ERROR\n?$/.test(buffer.join(""))) {
	            callback(new Error("Got demo-ui error: " + buffer));
	            return;
	        }

			console.log("messages", messages);

	        ASSERT.equal(messages.length, 5);

	        ASSERT.equal(messages[0], 'Connected');
	        ASSERT.equal(messages[1], 'Got message: {"say":"Connected"}');
	        ASSERT.equal(messages[2], 'Got message: "ping: 1"');
	        ASSERT.equal(messages[3], 'Got message: "ping: 2"');
	        ASSERT.equal(messages[4], 'Away');

	        callback(null);
	    });
	});
}


if (require.main === module) {
	exports.main(function(err) {
		if (err) {
			console.error(err.stack);
			process.exit(1);
		}
		console.log("OK");
		process.exit(0);
	});
}
