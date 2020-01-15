
module.exports = async (wd, port) => {
	/*
		aliases: --run, -r
		description: Using this option, you can develop individual applications detached from the online Def-ant service. Specify path and port when using this option. Example; defiant run . 8080
	*/

	const open = require("open")
	const chokidar = require("chokidar")
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
	console.log(`Started Def-ant application on port: ${port}`)

	// open browser
	let chrome = await open(`http://localhost:${port}`, { wait: false, app: ["google chrome", "--auto-open-devtools-for-tabs"] })

	// watch changes in source folder
	chokidar.watch(srcDir, { ignored: [destDir +"/**/*"] }).on("change", (path) => {
		if (~path.indexOf(".git")) return
		console.log("Rebuilt "+ build.name.white +" v"+ build.version)
		Build(srcDir, destDir)
	})

	/**/
	process.on("SIGINT", async () => {
		if (chrome) {
			// kill child process ?
		}
		// delete build folder
		await FS.deleteDir(destDir)

		process.exit()
	})
}
