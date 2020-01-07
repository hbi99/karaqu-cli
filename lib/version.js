
const package = require("../package.json")

module.exports = () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool.
	*/
	console.log("\ndefiant cli tool: version "+ package.version.white)
	console.log("ant-app-builder: version "+ package.dependencies["ant-app-builder"].slice(1).white +"\n")
}
