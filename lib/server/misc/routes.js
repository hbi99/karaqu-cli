
const mimes = require("mime").types
const fetch = require("node-fetch")
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
			// get file from server
			let result = await fetch(Defiant.domain)
			let body = await result.text()
			let rx = /(prod|dev):v(\d{1,}.\d{1,}.\d{1,})/
			let version = body.match(rx)[2]
			let ledger = await Defiant.getLedger(version)
			// precache ledger
			await cache.set(`ledger.${version}.xml`, ledger)
			// prepare index for local usage
			body = body.replace(rx, "cli:v$2")
			body = body.replace(/<link rel="manifest" href="\/manifest.json">/, "")
			// save file to cache
			await cache.set(key, body)
			
			res.send(body)
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
			// get file from server
			let result = await fetch(Defiant.domain + req.url)
			let body = await result.text()

			// if (req.url.endsWith(".css")) {
			// 	// body = body.replace(/\/cdn\/\w+\//mig, "")
			// 	body = body.replace(/\/res\/(\w+)\//mig, "/cdn/$1/")
			// }

			// save file to cache
			await cache.set(key, body)

			res.send(body)
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
