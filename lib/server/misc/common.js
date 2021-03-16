
const fs = require("fs")
const path = require("path")
const util = require("util")
const fetch = require("node-fetch")
const config = require("../../cfg")

let getIcons = ["icon-def-ant",
				"window-close",
				"window-minimize",
				"window-maximize",
				"window-restore",
				"icon-clock",
				"icon-check",
				"icon-plus",
				"icon-magnify",
				"icon-chevron-down",
				"icon-chevron-sort",
				"icon-color-preset",
				"icon-arrow-right",
				"icon-view-icons",
				"icon-view-list",
				"icon-view-columns",
				"icon-view-flow",
				"sidebar-home",
				"sidebar-desktop",
				"sidebar-documents",
				"sidebar-applications",
				"sidebar-network",
				"sidebar-shared",
				"sidebar-folder",
				"sidebar-dropbox",
				"sidebar-pcloud",
				"sidebar-box",
				"sidebar-google-drive",
				"tiny-generic-folder",
				"tiny-generic-document"]

// DEFIANT: START
const Defiant = {
	domain: config.antServer,
	async getLedger(cfg) {
		// get public version of files
		let url = `${Defiant.domain}/res/xml/ledger.${global.version}.xml`
		let result = await fetch(url)
		let body = await result.text()
		let details = body.match(/<details[\s\S]*?<\/details>/gm)
		let templates = body.match(/<xsl:stylesheet[\s\S]*?<\/xsl:stylesheet>/gm)
		let svgIcons = body.match(/<svg id="[\s\S]*?<\/svg>/gm)
		let mimeText = body.match(/<Mime[\s\S]*?<\/Mime>/gm)
		let langUrl = `${Defiant.domain}/cdn/i18n/en-en`
		let langResult = await fetch(langUrl)
		let langText = await langResult.text()
		let filePath = FS.path.join(__dirname, "cli-ledger.xml")
		let data = await FS.readFile(filePath)
		let ledger = data.toString()

		// only get some icons
		svgIcons = svgIcons.filter(icon => {
			let search = false
			getIcons.map(i => (search = search || icon.includes(i)))
			return search
		})

		ledger = ledger.replace(/<\/ledger>/, `${details} ${templates}</ledger>`)
		ledger = ledger.replace(/<i18n>\{\{i18n\}\}<\/i18n>/, langText.trim())
		ledger = ledger.replace(/<Mime>\{\{mime-types\}\}<\/Mime>/, mimeText)
		ledger = ledger.replace(/\{\{svg-icons\}\}/, svgIcons.join(""))
		ledger = ledger.replace(/\{\{app-ns\}\}/, cfg.appNs)
		ledger = ledger.replace(/\{\{app-id\}\}/, cfg.appId)

		return ledger;
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
