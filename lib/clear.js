
const package = require("../package.json")

module.exports = () => {
	/*
		aliases: --clear, -c
		description: Displays version of this tool.
	*/
	console.log("\ndefiant-cli: version "+ package.version.white)
	console.log("defiant-builder: version "+ package.dependencies["defiant-builder"].slice(1).white +"\n")
	console.log("dev-runtime: version "+ "1.2.3" +"\n")
}
