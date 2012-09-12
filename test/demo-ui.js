//#!/usr/bin/env phantomjs

var SYSTEM = require("system");
var WEBPAGE = require("webpage");
var FS = require("fs");


function main(callback) {

	function error(err) {
		callback(err);
	}

	var messages = [];
	var steps = [];
	var page = WEBPAGE.create();

	page.onLoadStarted = function () {
	    console.log("Start loading ..."); 
	};

	page.onConsoleMessage = function (msg) {
		if (/^:error:/.test(msg)) {
			error(msg.substring(7));
			return;
		} else
		if (/^:/.test(msg)) {
			steps[msg.substring(1)]();
			return;
		}

		messages.push(msg);
		console.log("[phantomjs]", msg);
	};

	page.onLoadFinished = function (status) {
	    console.log("Loading finished. Running tests ...");

	    try {

		    // Check some basic things.
			if (status !== "success") {
				return error("Page did not load with 'success'!");
			}

			steps["start"] = function() {
				page.evaluate(function () {
					console.log(":wait-a-bit");
				});
			}

			steps["wait-a-bit"] = function() {
				setTimeout(function() {

					if (messages[0] !== "Connecting") {
						return error('`message[0] !== "Connecting"');
					}
					if (messages[1] !== "Connected") {
						return error('`message[0] !== "Connected"');
					}
					if (messages[2].indexOf("Relaying message") !== 0) {
						return error('`message[0].indexOf("Relaying message") !== 0"');
					}
					if (messages[3] !== "Send ping: 1") {
						return error('`message[0] !== "Send ping: 1"');
					}
					if (messages[4] !== "Received pong: 1") {
						return error('`message[0] !== "Received pong: 1"');
					}
					if (messages[5] !== "Send ping: 2") {
						return error('`message[0] !== "Send ping: 2"');
					}
					if (messages[6] !== "Received pong: 2") {
						return error('`message[0] !== "Received pong: 2"');
					}

					steps["done"]();

				}, 3000);
			}

			steps["done"] = function() {
				callback(null);
			}

			steps["start"]();

		} catch(err) {
			callback(err);
		}
	};

	page.open("http://localhost:" + SYSTEM.args[1] + "/");
}

main(function(err) {
	if (err) {
		console.error((typeof err === "object" && err.stack)?err.stack:err);
		console.error("ERROR");
		phantom.exit(1);
	}
	phantom.exit(0);
});
