
module.exports = async (src, dest) => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application and it will be available to run in Defiant online service. Notice that file size limit 5MB and total package size limit is 10MB.
	*/
	const fetch = require("node-fetch")
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
	let build = await Build({ source, destination, uglify, compress })

	// verbose step
	console.log(`Defiant application ${build.name.white} v${build.version} build.`)
	
	let files = await FS.listDir(build.buildPath)
	let url = `${cfg.appServer}/app/${env.username}/${build.id}`
	let headers = { authorization: "Bearer "+ env.token }
	let formData = { }

	// calculate package size
	let pckgSize = 0
	await Promise.all(files.map(async filePath => {
		let stat = await FS.fileStat(filePath)
		pckgSize += stat.size
	}))


	// progress bar
	let barConfig = { complete: "█", incomplete: "░", width: 25, total: pckgSize }
	let bar = new progress("Uploading :bar :percent", barConfig)


	formData.Keys = files.map(filePath => filePath.slice(build.buildPath.length+1))
	formData.attachments = files.map(filePath => {
		let stream = FS.org.createReadStream(filePath)
						.on("data", chunk => bar.tick(chunk.length))
		return stream
	})

	return console.log(formData)


	// send files to server
	let req = request.post({ url, headers, formData }, async (err, resp, body) => {
		if (err) throw err
		switch (resp.statusCode) {
			case 401:
				console.log(Message.authFail)
				break
			case 413:
				console.log(Message.packageTooLarge)
				break
			case 422:
				console.log(Message.uploadFail)
				console.log(body)
				break
			case 200:
				console.log(body)
				break
		}
		// delete _build folder
		await FS.deleteDir(destDir)
	})
}
