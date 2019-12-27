
require("colors")

exports.help = require("./help")
exports.init = require("./init")
exports.login = require("./login")
exports.build = require("./build")
exports.publish = require("./publish")
exports.version = require("./version")


exports.aliases = () => {
	let manual = {}

	Object.keys(exports).map(fn => {
		if (fn === "aliases") return
		let line = exports[fn].toString().match(/aliases:(.+)$/mi)
		manual[fn] = line[1].trim().split(",").map(a => a.trim())
	})

	return manual
}

