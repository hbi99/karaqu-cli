
module.exports = async (src, dest) => {
	/*
		aliases: --build, -b
		description: Builds your source folder to an executable app in Defiant.
	*/

	const { FS, Message } = require("./common")
	const { Build } = require("defiant-builder")

	let source = FS.path.join(process.cwd(), src || "")
	let destination = FS.path.join(process.cwd(), dest || "")
	let uglify = true
	let compress = true
	if (source === destination) destination += "/_build"

	Build({ source, destination, uglify, compress })
		.then(build => {
			console.log(`Built Defiant Application ${build.name.white} v${build.version}`)
			console.log(`Build Path: .${build.buildPath.slice(process.cwd().length)}`)
			console.log(`Containing ${build.files.length-1} files`)
		})
		.catch(err => console.log(err.red))
}
