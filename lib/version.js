
const package = require("../package.json")

module.exports = () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool
	*/
	console.log("\ndefiant version: "+ package.version.white +"\n")
}
