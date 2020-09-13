
module.exports = async (bundleSrc) => {
	/*
		aliases: --bundle, -b
		description: Passing a file path to this option will bundle a javascript file. Useful when there is large dependencies.
	*/

	const { FS, Message } = require("./common")
	const { Bundle } = require("ant-app-builder")

	let srcFile = FS.path.join(process.cwd(), bundleSrc)
	let destFile = await Bundle(srcFile)
	console.log(`Bundled file: ${destFile}`)
}
