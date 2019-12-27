
module.exports = async (dir) => {
	/*
		aliases: --build, -b
		description: Builds your source folder to an executable app in Def-ant.
	*/

	const { FS, Message } = require("./common")
	const { Build } = require("./builder")

	const srcDir = FS.path.join(process.cwd(), dir)
	const buildDir = FS.path.join(srcDir, "_build")
	const uglify = false

	await Build(srcDir, buildDir, uglify)

	console.log("Done")
}
