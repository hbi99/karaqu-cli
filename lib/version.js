
const package = require("../package.json")

module.exports = async () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool.
	*/
	const { FS, Message } = require("./common")

	console.log("\ndefiant-cli: version "+ package.version.white)
	console.log("defiant-builder: version "+ package.dependencies["defiant-builder"].slice(1).white +"\n")
}
