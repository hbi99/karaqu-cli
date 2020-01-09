
const request = require("request")
const cache = require("./cache")
const { Defiant, FS } = require("./common")

const controller = {
	get(req, res, next) {
		res.send("ok")
	},
	async getLedger(req, res, next) {
		let key = "ledger.xml"
		let cached = await cache.get(key)
		
		// set content type
		res.type("application/xml")

		if (cached) {
			res.send(cached)
		} else {
			let url = `${Defiant.domain}/res/xml/ledger.${Defiant.version}.xml`
			let filePath = FS.path.join(__dirname, "public/res/xml/cli-defaults.xml")
			let cliDefaults = await FS.readFile(filePath)

			request(url, (err, resp, body) => {
				let data = body.replace(/<\/ledger>/, cliDefaults.toString() + "</ledger>")
				cache.set(key, data)
				res.send(data)
			})
		}
	},
	async getScript(req, res, next) {
		res.send("ok")
	},
	async getStyle(req, res, next) {
		res.send("ok")
	},
	getApplication(req, res, next) {
		let filePath = FS.path.join(__dirname, "public/app/ant/mines/index.xml")
		res.sendFile(filePath)
	}
}

module.exports = async (app) => {
	// initiate defiant
	await Defiant.init()

	app.get("/app/ant/mines", controller.getApplication)
	app.get("/res/xml/ledger.xml", controller.getLedger)
	app.get("/res/js/main.js", controller.getScript)
	app.get("/res/css/main.css", controller.getStyle)
}
