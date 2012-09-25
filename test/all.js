
const PATH = require("path");
const FS = require("fs");
const SPAWN = require("child_process").spawn;


function main(callback) {

	// TODO: Use `sm` for this: `sm test <packagePath>`
	function ensureDependenciesInstalled(packagePath, type, callback) {

		var keys = Object.keys(JSON.parse(FS.readFileSync(PATH.join(packagePath, "package.json")))[type]);
		var dirs = !PATH.existsSync(PATH.join(packagePath, "node_modules")) || FS.readdirSync(PATH.join(packagePath, "node_modules"));

		// See if dev dependencies are missing.
		if (dirs === true || diff(keys, dirs).length > 0) {
		    var proc = SPAWN("npm", [
		    	"install"
		    ], {
		    	cwd: packagePath
		    });

		    proc.on("error", function(err) {
		    	callback(err);
		    });
		    
		    proc.stdout.on("data", function(data) {
		        process.stdout.write(data.toString());
		    });
		    proc.stderr.on("data", function(data) {
		        process.stderr.write(data.toString());
		    });
		    proc.on("exit", function(code) {
		        if (code !== 0) {
		            callback(new Error("Did not get `status === 0`!"));
		            return;
		        }
		        callback(null);
		    });
		} else {
			callback(null);
		}
	}

	// TODO: Use `sm` for this: `sm test <packagePath>`
	function testPackage(packagePath, callback) {

	    var proc = SPAWN("npm", [
	    	"test"
	    ], {
	    	cwd: packagePath
	    });

	    proc.on("error", function(err) {
	    	callback(err);
	    });
	    
	    proc.stdout.on("data", function(data) {
	        process.stdout.write(data.toString());
	    });
	    proc.stderr.on("data", function(data) {
	        process.stderr.write(data.toString());
	    });
	    proc.on("exit", function(code) {
	        if (code !== 0) {
	            callback(new Error("Did not get `status === 0`!"));
	            return;
	        }
	        callback(null);
	    });
	}

	// @see http://stackoverflow.com/questions/1187518/javascript-array-difference
	function diff(a, b) {
	    return a.filter(function(i) {return !(b.indexOf(i) > -1);});
	};


	console.log("Running `./demo`:");

	ensureDependenciesInstalled(PATH.join(__dirname, "../demo"), "dependencies", function(err) {
		if (err) return callback(err);

		require("./demo").main(function(err) {
			if (err) return callback(err);

			return runEngineIoTests(callback);
		});

		function runEngineIoTests(callback) {

			console.log("Running `engine.io` and `engine.io-client` tests:")

			var path = PATH.join(__dirname, "../node_modules/engine.io");

			ensureDependenciesInstalled(path, "devDependencies", function(err) {
				if (err) return callback(err);

				testPackage(path, function(err) {
					if (err) return callback(err);

					path = PATH.join(__dirname, "../node_modules/engine.io/node_modules/engine.io-client");

					ensureDependenciesInstalled(path, "devDependencies", function(err) {
						if (err) return callback(err);

						testPackage(path, function(err) {
							if (err) return callback(err);

							callback(null);
						});
					});
				});
			});
		}
	});
}


if (require.main === module) {
	main(function(err) {
		if (err) {
			console.error(err.stack);
			process.exit(1);
		}
		console.log("OK");
		process.exit(0);
	});
}
