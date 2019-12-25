
require("colors")

const package = require("../package.json")

exports.help = () => {
	/*
		aliases: --help, -h
		description: Displays this help
	*/
	let format = require("cli-format")

	console.log("\nUsage: defiant "+ "<options>".white +"\n")

	Object.keys(exports).map(fn => {
		// exclude aliases
		if (fn === "aliases") return

		let fnBody = exports[fn].toString(),
			start = fnBody.indexOf("/*") + 2,
			end = fnBody.indexOf("*/"),
			decl = fnBody.slice(start, end).trim().replace(/\t/g, "").split("\n"),
			line = [{ width: 10, content: fn }]

		line.push({ width: 18, content: decl[0].split(": ")[1] })
		line.push({ width: 50, content: decl[1].split(": ")[1].gray })

		let result = format.columns.wrap(line)
		console.log(result)
	})
	console.log()
}


exports.aliases = () => {
	let man = {}
	
	Object.keys(exports).map(fn => {
		if (fn === "aliases") return
		let line = exports[fn].toString().match(/aliases:(.+)$/mi)
		man[fn] = line[1].trim().split(",").map(a => a.trim())
	})

	return man
}


exports.version = () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool
	*/
	console.log("\ndefiant version: "+ package.version.white +"\n")
}


exports.init = () => {
	/*
		aliases: --init, -i
		description: When starting a new application use this to create a scaffolded empty application. Useful for quick start.
	*/
	console.log("init")
}


exports.login = () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Def-ant and set your credentials.
	*/
	console.log("login")
}


exports.publish = () => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application to be used by everyone in Def-ant.
	*/
	console.log("publish")
}

