
const fs = require("fs")
const path = require("path")
const util = require("util")


const Message = {
	authFail: "Authentication failed".red +"\nTry to login again"
}

const FS = {
	org: fs,
	path: path,
	mkdir: util.promisify(fs.mkdir),
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	fileExists: util.promisify(fs.exists),
	fileStat: util.promisify(fs.stat),
}

module.exports = {
	Message,
	FS,
}
