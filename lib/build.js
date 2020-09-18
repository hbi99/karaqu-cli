
module.exports = async (src, dest, uglify = true) => {
	/*
		aliases: --build, -b
		description: Builds your source folder to an executable app in Defiant.
	*/

	const { FS, Message } = require("./common")
	const { Build } = require("ant-app-builder")

	let srcDir = FS.path.join(process.cwd(), src || "")
	let destDir = FS.path.join(process.cwd(), dest || "")
	if (srcDir === destDir) destDir += "/_build"

	let build = await Build(srcDir, destDir, uglify)
	console.log(`Built Defiant Application ${build.name.white} v${build.version}`)
	console.log(`Folder: ./${build.buildPath}`)
	console.log(`Containing ${build.files.length} files`)
}
