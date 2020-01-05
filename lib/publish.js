
module.exports = async (src, dest) => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application and it will be available to run in Def-ant online service. Notice that file size limit 5MB and total package size limit is 10MB.
	*/
	const request = require("request")
	const progress = require("progress")
	const cfg = require("./cfg")
	const { FS, Message } = require("./common")
	const { Build } = require("ant-app-builder")

	let cwd = process.cwd()
	let envFilePath = FS.path.join(__dirname, cfg.envFile)
	if (!await FS.fileExists(envFilePath)) return console.log(Message.authFail)
	let env = require(envFilePath)

	let srcDir = FS.path.join(cwd, src || "")
	let destDir = FS.path.join(cwd, dest || src || "")
	// prepare build and clean up
	if (srcDir === destDir) destDir = FS.path.join(destDir, "_build")
	if (await FS.fileExists(destDir)) await FS.deleteDir(destDir)
	// build application
	let build = await Build(srcDir, destDir, true)
	
	// verbose step
	console.log(`Def-ant application ${build.name.white} v${build.version} build.`)


	let url = `${cfg.appServer}/app/${env.username}/${build.id}`
	//let url = `http://localhost:40300/app/${env.username}/${build.id}`
	let headers = { authorization: "Bearer "+ env.token }
	let formData = { }

	// calculate package size
	let pckgSize = 0
	await Promise.all(build.files.map(async filename => {
		let filePath = FS.path.join(cwd, build.buildPath, filename)
		let stat = await FS.fileStat(filePath)
		pckgSize += stat.size
	}))

	// progress bar
	let barConfig = { complete: "█", incomplete: "░", width: 25, total: pckgSize }
	let bar = new progress("Uploading :bar :percent", barConfig)
	

	formData.Keys = build.files
	formData.attachments = build.files.map(filename => {
		let filePath = FS.path.join(cwd, build.buildPath, filename)
		let stream = FS.org.createReadStream(filePath)
						.on("data", chunk => bar.tick(chunk.length))
		return stream
	})

	// send files to server
	let req = request.post({ url, headers, formData }, async (err, resp, body) => {
		if (err) throw err
		switch (resp.statusCode) {
			case 401:
				console.log(Message.authFail)
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
