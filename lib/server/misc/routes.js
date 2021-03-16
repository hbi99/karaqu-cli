
const mimes = require("mime").types
const fetch = require("node-fetch")
const cache = require("./cache")
const { Defiant, FS } = require("./common")

let version = ""
let appId = ""
let appNs = "dev"
let cwd = ""

const controller = {
	async getIndex(req, res) {
		let key = "index.htm"
		let cached = await cache.get(key)

		// check online for new version of defiant
		let result = await fetch(Defiant.domain)
		let body = await result.text()
		let rx = /(prod|dev|cli):v(\d{1,}.\d{1,}.\d{1,})/
		global.version = body.match(rx)[2]

		if (cached) {
			let cached_version = cached.toString().match(rx)[2]
			if (global.version !== cached_version) {
				// flush all cached
				await cache.reset(true)
				// reset variable
				cached = false
			}
		}

		// set content type
		res.type("text/html")

		if (cached) {
			res.send(cached)
		} else {
			// get file from server
			let ledger = await Defiant.getLedger({ appNs, appId })
			// return res.send(ledger)

			// precache ledger
			await cache.set(`ledger.${global.version}.xml`, ledger)
			// prepare index for local usage
			body = body.replace(rx, "cli:v$2")
			body = body.replace(/<title>[\s\S]*?<\/title>/, `<title>Defiant [${appId}]</title>`)
			body = body.replace(/<link rel="manifest" href="\/manifest.json">/, "")
			// save file to cache
			await cache.set(key, body)
			
			res.send(body)
		}
	},

	async getAppIcon(req, res) {
		let iconPath = FS.path.join(process.cwd(), "_build/icon.svg")
		let iconFile = await FS.readFile(iconPath)
		// serve svg file
		res.setHeader("Content-Type", "application/xml")
		res.send(`<svg>${iconFile}</svg>`)
	},

	async getResource(req, res) {
		let parsed = FS.path.parse(req.url)
		let key = parsed.base
		let cached = await cache.get(key)
		
		//set content type
		res.type(mimes[parsed.ext.slice(1)])

		if (cached) {
			// if (key.startsWith("ledger")) {
				// cached = await Defiant.getLedger({ appNs, appId })
			// }
			res.send(cached)
		} else {
			// get file from server
			let result = await fetch(Defiant.domain + req.url)
			let buffer = await result.buffer()
			
			// TODO: remove later
			if (!(key.endsWith(".js"))) {
				// save file to cache
				await cache.set(key, buffer)
			}
			// send buffer to client
			res.send(buffer)
		}
	},

	getApplication(req, res) {
		let parsed = req.url.split("/").splice(4)
		if (!parsed.length) parsed.push(`${appId}.app`)

		let filePath = FS.path.join(cwd, parsed.join("/"))
		res.sendFile(filePath)
	},

	getCdnResource(req, res) {
		// proxy request
		fetch(Defiant.domain + req.url)
			.then(proxyRequest => {
					// forward headers
					let headers = proxyRequest.headers.raw()
					for (let key in headers) {
						if (key === "content-encoding") continue
						res.setHeader(key, headers[key].join(";"))
					}
					proxyRequest.body.pipe(res)
				})
	}
}

module.exports = async (app, wd, ns, id) => {
	cwd = wd
	appId = id
	appNs = ns

	app.get(`/app/icons`, controller.getAppIcon)
	app.get(`/app/${ns}/*`, controller.getApplication)
	app.get(`/cdn/*`, controller.getCdnResource)
	app.get("/", controller.getIndex)
	app.get("/*", controller.getResource)
}
