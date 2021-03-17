
const fs = require("fs")
const path = require("path")
const util = require("util")
const cfg = require("./cfg")


// Message: START
const Message = {
	authFail: "Authentication failed".red +"\nTry to login again",
	uploadFail: "Upload failed.",
	packageTooLarge: "Upload failed".red +"\nMaximum file size is 5M of individual files.\nApplication package should not exceed 15M.",
	notLoggedIn: "You have not logged in yet.\nLogin is required before publishing your application.",
	oldToken: "Your token is too old.\nPlease login to re-new security token.",
	tokenSuccess: "Token obtained",
	specifySrcPort: "You must specify "+ "source folder".underline +" and "+ "port".underline +"\nMake sure that you are in a application folder and try: `defiant run . 8080`",
	noAppIndex: "The specified folder does not contain `index.xml` file.",
	noFiles: "No files sent",
	noRuntime: "No runtime cached",
	runRequiresLogin: "Login is required to exchange messages other users.",
	runRequiresOauth: "'oauth-credentials.json' is required.",
}
// Message: END


// Token: START
const Token = {
	filePath: "env-config.json",
	async check() {
		let envFilePath = FS.path.join(__dirname, this.filePath)
		let env = { username: "unknown" }
		// check if file exists
		if (await FS.fileExists(envFilePath)) {
			env = require(envFilePath)
		}

		return env
	},
	async validate() {
		// check if file exists
		let envFilePath = FS.path.join(__dirname, this.filePath)
		if (!await FS.fileExists(envFilePath)) return console.log(Message.notLoggedIn.red)

		// check login token age
		let env = require(envFilePath)
		if (env.lastLogin < Date.now() - cfg.tokenTTL) return console.log(Message.oldToken.red)

		return env
	},
	async save(data) {
		let envFilePath = FS.path.join(__dirname, this.filePath)
		await FS.writeFile(envFilePath, JSON.stringify(data), "utf8")
	}
}
// Token: END


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
				if (!exists) await FS.mkdir(fDest)
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
	mkdir: util.promisify(fs.mkdir),
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
	Message,
	Token,
	FS,
}
