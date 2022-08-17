
module.exports = () => {
	/*
		aliases: --help, -h
		description: Displays this help.
	*/
	let format = require("cli-format")

	console.log("\nUsage: karaqu "+ "<options>".white +"\n")

	Object.keys(module.parent.exports).map(fn => {
		// exclude aliases
		if (fn === "aliases") return

		let fnBody = module.parent.exports[fn].toString(),
			start = fnBody.indexOf("/*") + 2,
			end = fnBody.indexOf("*/"),
			decl = fnBody.slice(start, end).trim().replace(/\t/g, "").split("\n"),
			line = [{ width: 9, content: fn }]

		line.push({ width: 15, content: decl[0].split(": ")[1] })
		line.push({ width: 50, content: decl[1].split(": ")[1].gray })

		let result = format.columns.wrap(line)
		console.log(result)
	})
}
