
module.exports = async (src, dest) => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application and it will be available to run in Defiant online service. Notice that file size limit 5MB and total package size limit is 10MB.
	*/
	const fetch = require("node-fetch")
	const FormData = require("form-data")
	const progress = require("progress")
	const cfg = require("./cfg")
	const { FS, Message } = require("./common")
	const { Build } = require("defiant-builder")

	let cwd = process.cwd()
	let envFilePath = FS.path.join(__dirname, cfg.envFile)
	if (!await FS.fileExists(envFilePath)) return console.log(Message.authFail)
	let env = require(envFilePath)

	let source = FS.path.join(cwd, src || "")
	let destination = FS.path.join(cwd, dest || src || "")
	let uglify = true
	let compress = true
	// prepare build and clean up
	if (source === destination) destination = FS.path.join(destination, "_build")
	if (await FS.fileExists(destination)) await FS.deleteDir(destination)

	// build application
	Build({ source, destination, uglify, compress })
		.then(async build => {
			// verbose step
			console.log(`Defiant application ${build.name.white} v${build.version} build.`)
			
			let files = await FS.listDir(build.buildPath)
			let url = `${cfg.appServer}/app/${env.username}/${build.id}`
			let headers = { authorization: "Bearer "+ env.token }

			// calculate package size
			let pckgSize = 0
			await Promise.all(files.map(async filePath => {
				let stat = await FS.fileStat(filePath)
				pckgSize += stat.size
			}))


			// progress bar
			let barConfig = { complete: "█", incomplete: "░", width: 25, total: pckgSize }
			let bar = new progress("Uploading :bar :percent", barConfig)


			let body = new FormData()
			files.map(filePath => {
				let name = filePath.slice(build.buildPath.length+1)
				let stream = FS.org.createReadStream(filePath)
								.on("data", chunk => bar.tick(chunk.length))
				// add entry to form
				body.append("file", stream, name)
			})

			// send files to server
			let result = await fetch(url, { method: "POST", body, headers })

			switch (result.status) {
				case 304:
					console.log(Message.noFiles)
					break
				case 401:
					console.log(Message.authFail)
					break
				case 413:
					console.log(Message.packageTooLarge)
					break
				case 422:
					console.log(Message.uploadFail)
					// console.log(body)
					break
				case 200:
					// console.log(body)
					break
			}

			// delete _build folder
			await FS.deleteDir(build.buildPath)
		})
		.catch(err => {
			console.log(err.red)
			// delete _build folder
			FS.deleteDir(destination)
		})
}
