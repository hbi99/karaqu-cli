
module.exports = async () => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application to be used by everyone in Def-ant.
	*/
	let ProgressBar = require("progress")
	let bar = new ProgressBar("[:bar] :percent", { total: 20 })
	let timer = setInterval(() => {
			bar.tick()
			if (bar.complete) {
				clearInterval(timer)
			}
		}, 100)
}
