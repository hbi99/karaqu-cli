
module.exports = async (wd, port) => {
	/*
		aliases: --run, -r
		description: Using this option, you can develop individual applications detached from the online Defiant service. Specify path and port when using this option. Example; defiant run . 8080
	*/
	
	const open = require("open")
	const chokidar = require("chokidar")
	const server = require("./server/app")
	const cache = require("./server/misc/cache")
	const { FS, Message, Token } = require("./common")
	const { Build } = require("defiant-builder")
	const buildOpts = { uglify: false, compress: true }

	if (!wd || !port) {
		return console.log(Message.specifySrcPort)
	}

	let source = FS.path.join(process.cwd(), wd)
	let destination = FS.path.join(process.cwd(), wd, "_build" || "")
	let appIndex = FS.path.join(source, "index.xml")

	if (!await FS.fileExists(appIndex)) {
		return console.log(Message.noAppIndex)
	}

	// build application, create server & start
	Build({ ...buildOpts, source, destination })
		.then(async build => {
			// conditional "run require" checks
			for (let key in build.runRequires) {
				let description = build.runRequires[key]
				
				switch (key) {
					case "login":
						let token = await Token.validate()
						if (!token) return console.log((description || Message.runRequiresLogin).red)
						break
					case "oauth":
						if (!build.files.includes("oauth-credentials.json")) {
							return console.log((description || Message.runRequiresOauth).red)
						}
						break
				}
			}

			let dev = server(destination, port, build.namespace, build.id)
			console.log(`Started Defiant application on port: ${port}`)

			// watch server files
			let serverSrc = FS.path.join(__dirname, "server")
			let ignoreSrc = FS.path.join(__dirname, "server/_cache")
			chokidar.watch(serverSrc, { ignored: [ignoreSrc +"/**/*"] }).on("change", path => dev.restart())

			// open browser
			await open(`http://localhost:${port}`, { app: ["google chrome", "--auto-open-devtools-for-tabs"] })

			// watch changes in source folder
			chokidar.watch(source, { ignored: [destination +"/**/*"] }).on("change", (path) => {
				if (~path.indexOf(".git")) return
				console.log("Rebuilt "+ build.name.white +" v"+ build.version)
				Build({ ...buildOpts, source, destination })
			})

			//** execute when proecess is killed
			process.on("SIGINT", async () => {
				// delete build folder
				await FS.deleteDir(destination)

				// cleanse ledger
				let cacheSrc = FS.path.join(__dirname, "server", "_cache")
				let list = await FS.readDir(cacheSrc)
				await Promise.all(list.map(async filepath => {
					if (filepath === "index.htm" || filepath.startsWith("ledger.")) {
						await cache.clear(filepath)
					}
				}))

				process.exit()
			})
		})
		.catch(error => {
			// build proecure returned error
			console.log(error.red)
		})

}
