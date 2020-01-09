
const mimes = require("mime").types
const request = require("request")
const cache = require("./cache")
const { Defiant, FS } = require("./common")

const controller = {
	async getIndex(req, res, next) {
		let key = `index.htm`
		let cached = await cache.get(key)

		// set content type
		res.type("text/html")

		if (cached) {
			res.send(cached)
		} else {
			request(Defiant.domain, (err, resp, body) => {
				body = body.replace(/prod:v(\d.\d.\d)/, "cli:v$1")
				cache.set(key, body)
				res.send(body)
			})
		}
	},

	async getResource(req, res, next) {
		let parsed = FS.path.parse(req.url)
		let key = parsed.base
		let cached = await cache.get(key)

		//set content type
		res.type(mimes[parsed.ext.slice(1)])

		if (cached) {
			res.send(cached)
		} else {
			let url = Defiant.domain + req.url

			request(url, async (err, resp, body) => {
				if (key.startsWith("ledger")) {
					let filePath = FS.path.join(__dirname, "public/cli-defaults.xml")
					let data = await FS.readFile(filePath)
					body = body.replace(/<\/ledger>/, data.toString() + "</ledger>")
				}
				cache.set(key, body)
				res.send(body)
			})
		}
	},

	getApplication(req, res, next) {
		let filePath = FS.path.join(__dirname, "public/app/ant/mines/index.xml")
		res.sendFile(filePath)
	}
}

module.exports = async (app) => {
	app.get("/app/ant/mines", controller.getApplication)
	app.get("/", controller.getIndex)
	app.get("/res/*", controller.getResource)
}
