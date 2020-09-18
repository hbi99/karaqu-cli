
const fs = require("fs")
const path = require("path")
const util = require("util")
const request = require("request")

// DEFIANT: START
const Defiant = {
	domain: "https://defiantsystem.com",
	//domain: "http://localhost:40100",
	getLedger(version) {
		// save public version of defiant
		Defiant.version = version

		let url = `${Defiant.domain}/res/xml/ledger.${version}.xml`

		return new Promise((resolve, reject) => {
			request(url, async (err, resp, body) => {
				let filePath = FS.path.join(__dirname, "cli-defaults.xml")
				let data = await FS.readFile(filePath)

				body = body
					.replace(/<applications[\s\S]*?<\/applications>/gm, "<applications/>")
					.replace(/<\/ledger>/, data.toString() + "</ledger>")
				
				resolve(body)
			})
		})
	}
}
// DEFIANT: END

// FS: START
const copyDir = async (src, dest) => {
	let list = await FS.readDir(src)
	list = list.filter(f => !f.startsWith("."))
	
	await Promise.all(list.map(async file => {
			let fSrc = FS.path.join(src, file)
			let fDest = FS.path.join(dest, file)
			let exists = await FS.fileExists(fDest)
			let stat = await FS.fileStat(fSrc)

			if (stat.isDirectory()) {
				if (!exists) await FS.mkDir(fDest)
				await copyDir(fSrc, fDest)
			} else {
				await FS.copyFile(fSrc, fDest)
		 	}
		}))
}

const deleteDir = async (dir) => {
	let list = await FS.readDir(dir)

	await Promise.all(list.map(async file => {
			let fPath = FS.path.join(dir, file)
			let stat = await FS.fileStat(fPath)

			if (stat.isDirectory()) {
				await deleteDir(fPath)
			} else {
				await FS.unlink(fPath)
		 	}
		}))
	
	await FS.rmdir(dir)
}

const listDir = async (dir) => {
	let ret = []
	let list = await FS.readDir(dir)
	list = list.filter(f => !f.startsWith("."))

	await Promise.all(list.map(async file => {
			let fPath = FS.path.join(dir, file)
			let stat = await FS.fileStat(fPath)

			if (stat.isDirectory()) {
				let sub = await listDir(fPath)
				ret = ret.concat(sub)
			} else {
				ret.push(fPath)
		 	}
		}))

	return ret
}

const pMkdir = util.promisify(fs.mkdir)
const mkDir = async (dir) => pMkdir(dir, { recursive: true })

const FS = {
	org: fs,
	path,
	mkDir,
	rmdir: util.promisify(fs.rmdir),
	unlink: util.promisify(fs.unlink),
	readDir: util.promisify(fs.readdir),
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	fileExists: util.promisify(fs.exists),
	fileStat: util.promisify(fs.stat),
	copyFile: util.promisify(fs.copyFile),
	listDir,
	copyDir,
	deleteDir,
}
// FS: END

module.exports = {
	Defiant,
	FS,
}
