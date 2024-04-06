
import { FS, Mimes } from "../../src/common.mjs";


// swap folder for fast access / cache
let __dirname = new URL(import.meta.url +"/..").pathname;
let swapDir = FS.path.join(__dirname, "/_cache");
let AGE = 24 * 60 * 60 // set default 24h


let Cache = {
	async reset(flush) {
		if (flush) {
			await FS.deleteDir(swapDir);
		}
		// create cache folder if its not already created
		if (!await FS.fileExists(swapDir)) {
			await FS.mkDir(swapDir);
		}
	},
	async get(key) {
		key = key.replace(/\//g, "-");
		let filePath = FS.path.join(swapDir, key);
		let parsed = FS.path.parse(filePath);

		if (await FS.fileExists(filePath)) {
			// check cached file age
			let stat = await FS.fileStat(filePath);
			if ((Date.now() - stat.mtimeMs) / 1000 > AGE) return;

			let data = await FS.readFile(filePath);
			return (parsed.ext === "json") ? JSON.parse(data) : data;
		}
	},
	async set(key, data) {
		key = key.replace(/\//g, "-");
		let filePath = FS.path.join(swapDir, key);
		await FS.writeFile(filePath, data);
	},
	getKeyTime(key) {
		let filePath = this.getKeyPath(key);
		return FS.fileStat(filePath);
	},
	getKeyPath(key) {
		key = key.replace(/\//g, "-");
		return FS.path.join(swapDir, key);
	},
	streamSet(key) {
		key = key.replace(/\//g, "-");
		let filePath = FS.path.join(swapDir, key);
		return FS.org.createWriteStream(filePath);
	},
	async streamGet(res, key) {
		key = key.replace(/\//g, "-");
		let filePath = FS.path.join(swapDir, key);

		if (await FS.fileExists(filePath)) {
			// check cached file age
			let stat = await FS.fileStat(filePath);
			if ((Date.now() - stat.mtimeMs) / 1000 > AGE) return;

			//set content type
			let parsed = FS.path.parse(filePath);
			if (Mimes[parsed.ext.slice(1)]) {
				res.type(Mimes[parsed.ext.slice(1)]);
			}
			return FS.org.createReadStream(filePath);
		}
	},
	async clear(key) {
		key = key.replace(/\//g, "-")
		console.log(key);
		let list = await FS.readDir(swapDir)
		list = list.filter(file => file.startsWith(key))
		console.log(list);
		await Promise.all(list.map(file => FS.unlink(swapDir +"/"+ file)))
	}
};

// auto reset
Cache.reset();

export default Cache;
