
module.exports = async (wd, port) => {
	/*
		aliases: --run, -r
		description: Using this option, you can develop individual applications detached from the online Def-ant service.
	*/

	const server = require("./server/app")
	const { FS, Message } = require("./common")
	const { Build } = require("ant-app-builder")

	if (!wd || !port) {
		return console.log(Message.specifySrcPort)
	}

	let srcDir = FS.path.join(process.cwd(), wd)
	let destDir = FS.path.join(process.cwd(), wd, "_build" || "")
	let appIndex = FS.path.join(srcDir, "index.xml")

	if (!await FS.fileExists(appIndex)) {
		return console.log(Message.noAppIndex)
	}

	// build application
	let build = await Build(srcDir, destDir)
	let app = await server.start(destDir, port, build.id)

	console.log("Express app started on port " + port)
}
