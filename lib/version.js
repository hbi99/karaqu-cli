
const package = require("../package.json")

module.exports = async () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool.
	*/
	const { FS, Message } = require("./common")

	let rtString = Message.noRuntime
	let indexPath = FS.path.join(__dirname, "server/_cache/index.htm")
	// check cached version
	if (await FS.fileExists(indexPath)) {
		let indexFile = await FS.readFile(indexPath)
		let vRuntime = indexFile.toString().match(/<html def-ant="cli:v(\d+.\d+.\d+)">/)
		if (vRuntime) {
			rtString = "dev-runtime: version "+ vRuntime[1].white +"\n"
		}
	}

	console.log("\ndefiant-cli: version "+ package.version.white)
	console.log("defiant-builder: version "+ package.dependencies["defiant-builder"].slice(1).white)
	console.log(rtString)
}
