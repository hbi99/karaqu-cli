
module.exports = async (src, dest, uglify = true) => {
	/*
		aliases: --build, -b
		description: Builds your source folder to an executable app in Def-ant.
	*/

	const { FS, Message } = require("./common")
	const { Build } = require("ant-app-builder")

	let srcDir = FS.path.join(process.cwd(), src || "")
	let destDir = FS.path.join(process.cwd(), dest || "")
	if (srcDir === destDir) destDir += "/_build"

	let build = await Build(srcDir, destDir, uglify)
	console.log(`Built Def-ant application ${build.name.white} v${build.version} at: ./${build.buildPath}`)
}
