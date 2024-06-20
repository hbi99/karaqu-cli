
import fetch from "node-fetch";
import Cache from "./cache.mjs";
import { FS, Karaqu, Mimes } from "../../common.mjs";


let version = "";
let appId = "";
let appNs = "dev";
let cwd = "";

let controller = {
	async getIndex(req, res) {
		let key = "index.htm";
		let cached = await Cache.get(key);
		// check online for new version of karaqu
		let result = await fetch(Karaqu.domain);
		if (result.status !== 200) {
			return res.sendStatus(result.status);
		}

		let body = await result.text();
		let rx = /(prod|dev|cli):v(\d{1,}.\d{1,}.\d{1,})/;
		global.version = body.match(rx)[2];
		
		if (cached) {
			let cached_version = cached.toString().match(rx)[2];
			if (global.version !== cached_version) {
				// flush all cached
				await Cache.reset(true);
				// reset variable
				cached = false;
			}
		}

		// set content type
		res.type("text/html");
		res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
		res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

		if (cached) {
			res.send(cached);
		} else {
			// get file from server
			let ledger = await Karaqu.getLedger({ appNs, appId });

			// precache ledger
			await Cache.set(`ledger.${global.version}.xml`, ledger);
			// prepare index for local usage
			body = body.replace(rx, "cli:v$2");
			body = body.replace(/<title>[\s\S]*?<\/title>/, `<title>Karaqu [${appId}]</title>`);
			body = body.replace(/<link rel="manifest" href="\/manifest.json">/, "");
			// save file to cache
			await Cache.set(key, body);
			
			res.send(body);
		}
	},

	async getAppIcon(req, res) {
		let iconPath = FS.path.join(process.cwd(), "_build/icon.svg");
		let iconFile = await FS.readFile(iconPath);
		// serve svg file
		res.setHeader("Content-Type", "application/xml");
		res.send(`<svg>${iconFile}</svg>`);
	},

	async getResource(req, res) {
		let parsed = FS.path.parse(req.url);
		let key = parsed.base;
		let cached = await Cache.get(key);
		//set content type
		res.type(Mimes[parsed.ext.slice(1)]);

		if (cached && !key.endsWith(".woff2")) {
			res.send(cached);
		} else {
			// get file from server
			let result = await fetch(Karaqu.domain + req.url);
			
			// save resource to cache
			if (!(key.endsWith(".js"))) {
				// save file to cache
				result.clone().body.pipe(Cache.streamSet(key));
				// send buffer to client
				return result.body.pipe(res);
			}
			// send buffer to client
			let buffer = await result.text();
			res.send(buffer);
		}
	},

	getApplication(req, res) {
		let parsed = req.url.split("/").splice(4);
		if (!parsed.length) parsed.push(`${appId}.app`);
		let filePath = FS.path.join(cwd, parsed.join("/"));
		res.sendFile(filePath);
	},

	getCdnResource(req, res) {
		// proxy request
		fetch(Karaqu.domain + req.url)
			.then(proxyRequest => {
					// forward headers
					let headers = proxyRequest.headers.raw();
					for (let key in headers) {
						if (key === "content-encoding") continue;
						res.setHeader(key, headers[key].join(";"));
					}
					proxyRequest.body.pipe(res);
				});
	},

	close(req, res) {
		// send "ok" to client
		res.sendStatus(200);
		// exit shell
		process.exit();
	}
};

export default async (app, wd, ns, id) => {
	cwd = wd;
	appId = id;
	appNs = ns;

	app.get(`/user/logout`, controller.close);
	app.get(`/app/icons`, controller.getAppIcon);
	app.get(`/app/${ns}/${id}`, controller.getApplication);
	app.get(`/cdn/*`, controller.getCdnResource);
	app.get("/", controller.getIndex);
	app.get("/*", controller.getResource);
};
