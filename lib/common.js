
const fs = require("fs")
const path = require("path")
const util = require("util")


const Message = {
	authFail: "Authentication failed".red +"\nTry to login again"
}

const copyDir = async (src, dest) => {
	let list = await FS.readDir(src)

	list.filter(f => !f.startsWith("."))
		.map(async file => {
			let fSrc = FS.path.join(src, file)
			let fDest = FS.path.join(dest, file)
			let exists = await FS.fileExists(fDest)
			let stat = await FS.fileStat(fSrc)

			if (stat.isDirectory()) {
				if (!exists) await FS.mkdir(fDest)
				await copyDir(fSrc, fDest)
			} else {
				await FS.copyFile(fSrc, fDest)
		 	}
		})
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

const FS = {
	org: fs,
	path: path,
	mkdir: util.promisify(fs.mkdir),
	rmdir: util.promisify(fs.rmdir),
	readDir: util.promisify(fs.readdir),
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	fileExists: util.promisify(fs.exists),
	fileStat: util.promisify(fs.stat),
	copyFile: util.promisify(fs.copyFile),
	unlink: util.promisify(fs.unlink),
	copyDir,
	deleteDir,
}

module.exports = {
	Message,
	FS,
}
