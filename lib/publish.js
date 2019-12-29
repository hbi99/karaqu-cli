
module.exports = async (src, dest) => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application and it will be available to run in Def-ant online service.
	*/
	const request = require("request")
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
	let headers = { authorization: "Bearer "+ env.token }
	let formData = { }

	formData.Keys = build.files
	formData.attachments = build.files.map(filename => {
		let filePath = FS.path.join(cwd, build.buildPath, filename)
		return FS.org.createReadStream(filePath)
	})

	//return console.log(formData)

	request.post({ url, headers, formData }, async (err, resp, body) => {
			if (err) throw err
			switch (resp.statusCode) {
				case 401:
					console.log(Message.authFail)
					break
				case 200:
					console.log(body)
					break
			}
			// delete _build folder
			await FS.deleteDir(destDir)
		})
}

/*
	let ProgressBar = require("progress")
	let bar = new ProgressBar("[:bar] :percent", { total: 20 })
	let timer = setInterval(() => {
			bar.tick()
			if (bar.complete) {
				clearInterval(timer)
			}
		}, 100)
*/
