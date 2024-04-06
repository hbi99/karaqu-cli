
require("colors");

exports.help = require("./help");
exports.version = require("./version");
exports.config = require("./config");
exports.init = require("./init");
exports.run = require("./run");
exports.login = require("./login");
exports.publish = require("./publish");

exports.aliases = () => {
	let manual = {};

	Object.keys(exports).map(fn => {
		if (fn === "aliases") return;
		let line = exports[fn].toString().match(/aliases:(.+)$/mi);
		manual[fn] = line[1].trim().split(",").map(a => a.trim());
	});

	return manual;
};

