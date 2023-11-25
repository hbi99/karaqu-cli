
const package = require("../package.json");

module.exports = async () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool.
	*/
	const { FS, Message } = require("./common");

	console.log("\nkaraqu-cli: version "+ package.version.white);
	console.log("karaqu-builder: version "+ package.dependencies["karaqu-builder"].slice(1).white +"\n");
};
