
const { FS } = require("./common")
const mimes = require("mime").types

const AGE = 24 * 60 * 60 // set default 24h
const swapDir = FS.path.join(__dirname, "../_cache")

// auto initiate
init()


async function init() {
	// create cache folder if its not already created
	if (!await FS.fileExists(swapDir)) await FS.mkDir(swapDir)
}

function getKeyPath(key) {
	key = key.replace(/\//g, "-")
	return FS.path.join(swapDir, key)
}

async function get(key) {
	key = key.replace(/\//g, "-")

	let filePath = FS.path.join(swapDir, key)
	let parsed = FS.path.parse(filePath)

	if (await FS.fileExists(filePath)) {
		// check cached file age
		let stat = await FS.fileStat(filePath)
		if ((Date.now() - stat.mtimeMs) / 1000 > AGE) return

		let data = await FS.readFile(filePath)
		return (parsed.ext === "json") ? JSON.parse(data) : data
	}
}

async function set(key, data) {
	key = key.replace(/\//g, "-")
	let filePath = FS.path.join(swapDir, key)

	await FS.writeFile(filePath, data)
}

async function streamGet(res, key) {
	key = key.replace(/\//g, "-")
	let filePath = FS.path.join(swapDir, key)
	let parsed = FS.path.parse(filePath)

	if (await FS.fileExists(filePath)) {
		// check cached file age
		let stat = await FS.fileStat(filePath)
		if ((Date.now() - stat.mtimeMs) / 1000 > AGE) return

		//set content type
		res.type(mimes[parsed.ext.slice(1)])

		return FS.org.createReadStream(filePath)
	}
}

function streamSet(key) {
	key = key.replace(/\//g, "-")
	let filePath = FS.path.join(swapDir, key)

	return FS.org.createWriteStream(filePath)
}

async function clear(key) {
	key = key.replace(/\//g, "-")

	let list = await FS.readDir(swapDir)
	list = list.filter(file => file.startsWith(key))

	await Promise.all(list.map(file => FS.unlink(swapDir +"/"+ file)))
}

module.exports = {
	get,
	set,
	streamSet,
	streamGet,
	getKeyPath,
	clear,
}
