
const mimes = require("mime").types
const request = require("request")
const cache = require("./cache")
const { Defiant, FS } = require("./common")

let appId = "mines"
let cwd = ""

const controller = {
	async getIndex(req, res, next) {
		let key = `index.htm`
		let cached = await cache.get(key)

		// set content type
		res.type("text/html")

		if (cached) {
			res.send(cached)
		} else {
			request(Defiant.domain, async (err, resp, body) => {
				let rx = /(prod|dev):v(\d{1,}.\d{1,}.\d{1,})/
				let version = body.match(rx)[2]
				let ledger = await Defiant.getLedger(version)
				// precache ledger
				cache.set(`ledger.${version}.xml`, ledger)

				body = body.replace(rx, "cli:v$2")
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
			if (key.startsWith("ledger")) {
				cached = cached.toString().replace(/\{\{app-id\}\}/, appId)
			}
			res.send(cached)
		} else {
			request(Defiant.domain + req.url, async (err, resp, body) => {
				cache.set(key, body)
				res.send(body)
			})
		}
	},

	getApplication(req, res, next) {
		let parsed = req.url.split("/").splice(4)
		if (!parsed.length) parsed.push("index.xml")

		let filePath = FS.path.join(cwd, parsed.join("/"))
		res.sendFile(filePath)
	}
}

module.exports = async (app, wd, id) => {
	cwd = wd
	appId = id

	app.get("/app/ant/*", controller.getApplication)
	app.get("/", controller.getIndex)
	app.get("/*", controller.getResource)
}
