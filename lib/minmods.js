
module.exports = async (wd, port) => {
	/*
		aliases: --minmods, -m
		description: This option, when executed in a folder of Javascript modules, minifies and saves all files with ".min" before file extension.
	*/

	const { FS, Message } = require("./common")
	const { MinifyModules } = require("ant-app-builder")

	let srcDir = process.cwd()
	let list = await MinifyModules(srcDir)
	console.log(`Minified ${list.length} files`)
}
