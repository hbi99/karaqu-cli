
module.exports = async (wd, port) => {
	/*
		aliases: --run, -r
		description: Using this option, you can develop individual applications detached from the online Defiant service. Specify path and port when using this option. Example; defiant run . 8080
	*/

	const open = require("open")
	const chokidar = require("chokidar")
	const server = require("./server/app")
	const { FS, Message } = require("./common")
	const { Build } = require("defiant-builder")

	if (!wd || !port) {
		return console.log(Message.specifySrcPort)
	}

	let source = FS.path.join(process.cwd(), wd)
	let destination = FS.path.join(process.cwd(), wd, "_build" || "")
	let appIndex = FS.path.join(source, "index.xml")

	if (!await FS.fileExists(appIndex)) {
		return console.log(Message.noAppIndex)
	}

	// build application
	let build = await Build({ source, destination })
	let app = await server.start(destination, port, build.id)
	console.log(`Started Defiant application on port: ${port}`)

	// open browser
	// let chrome = await open(`http://localhost:${port}`, { wait: false, app: ["google chrome", "--auto-open-devtools-for-tabs"] })

	// watch changes in source folder
	chokidar.watch(source, { ignored: [destination +"/**/*"] }).on("change", (path) => {
		if (~path.indexOf(".git")) return
		console.log("Rebuilt "+ build.name.white +" v"+ build.version)
		Build({ source, destination })
	})

	/**/
	process.on("SIGINT", async () => {
		// if (chrome) {
			// kill child process ?
		// }
		// delete build folder
		await FS.deleteDir(destination)

		process.exit()
	})
}
