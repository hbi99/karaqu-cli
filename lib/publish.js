
module.exports = async () => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application to be used by everyone in Def-ant.
	*/
	const request = require("request")
	const config = require("./config")
	const { FS, Message } = require("./common")

	const envFilePath = FS.path.join(__dirname, "..", config.envFile)
	if (!await FS.fileExists(envFilePath)) return console.log(Message.authFail)
	const envFile = require(envFilePath)

	const cwd = process.cwd()
	const indexFile = await FS.readFile(cwd +"/index.xml")
	
	let head = indexFile.toString().replace(/\t/g, "")
	head = head.slice(head.indexOf("<Head>") + 6, head.indexOf("</Head>"))
	console.log(head)

	return

	const url = `${config.appServer}/app/ant/test`
	const headers = { authorization: "Bearer "+ envFile.token }
	const formData = {
			file: fs.createReadStream(__dirname + "/../index.xml"),
		}

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
