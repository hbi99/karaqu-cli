
const { FS, Message } = require("./common")

const Build = (srcDir, destDir, uglify) => {
	return new Promise(async (resolve, reject) => {
		let appXml = await FS.readFile(`${srcDir}/index.xml`)
		appXml = appXml.toString()
		appXml = appXml.replace(/\t|\n/g, "")

		console.log(appXml)

		resolve()
	})
}

module.exports = {
	Build,
}
