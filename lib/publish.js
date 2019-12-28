
module.exports = async (src, dest) => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application to be used by everyone in Def-ant.
	*/
	const request = require("request")
	const config = require("./config")
	const { FS, Message } = require("./common")
	const { Build } = require("ant-app-builder")

	const cwd = process.cwd()
	const envFilePath = FS.path.join(cwd, config.envFile)
	if (!await FS.fileExists(envFilePath)) return console.log(Message.authFail)
	const env = require(envFilePath)


	let srcDir = FS.path.join(cwd, src || "")
	let destDir = FS.path.join(cwd, dest || src || "")
	if (srcDir === destDir) destDir = FS.path.join(destDir, "..", "_build")
	let build = await Build(srcDir, destDir, true)
	
	// verbose step
	console.log(`Def-ant application ${build.name.white} v${build.version} build.`)
	//return console.log(build.files)

	const url = `${config.appServer}/app/${env.username}/${build.id}`
	const headers = { authorization: "Bearer "+ env.token }
	const formData = { }

	formData.Keys = build.files
	formData.attachments = build.files.map(filename => {
		let filePath = FS.path.join(cwd, build.buildPath, filename)
		return FS.org.createReadStream(filePath)
	})

	//return console.log(formData)

	request.post({ url, headers, formData }, (err, resp, body) => {
			if (err) throw err
			switch (resp.statusCode) {
				case 401:
					console.log(Message.authFail)
					break
				case 200:
					console.log(body)
					break
			}
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
