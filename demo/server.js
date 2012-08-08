#!/usr/bin/env node

const PATH = require("path");
const ARCHITECT = require("architect");

var port = process.env.PORT || 8080;

var plugins = [
    {
        packagePath: "connect-architect/connect",
        host: "localhost",
        port: port
    },
    {
        packagePath: "connect-architect/connect.session",
        key: "connect.architect." + port,
        secret: "1234"
    },
    {
        packagePath: "connect-architect/connect.session.memory"
    },
    {
        packagePath: "architect/plugins/architect.log"
    },
    {
        packagePath: "./../server-plugin",
        prefix: "/transport/server"
    },
    {
	    provides: [],
	    consumes: [
			"smith.transport.server",
	        "connect"
	    ],
	    setup: function(options, imports, register) {

		    imports.connect.useStart(imports.connect.getModule().static(PATH.join(__dirname, "www")));

		    register(null, {});
	    }
	}
];

ARCHITECT.createApp(ARCHITECT.resolveConfig(plugins, __dirname), function (err, app) {
    if (err) {
        console.error("While starting!");
        throw err;
    }
    console.log("Started!");
});
