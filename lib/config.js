
module.exports = async () => {
	/*
		aliases: --config, -c
		description: Displays last saved login information.
	*/
	const cfg = require("./cfg")
	const { FS, Message } = require("./common")

	const envFilePath = FS.path.join(__dirname, cfg.envFile)
	// check if file exists
	if (!await FS.fileExists(envFilePath)) return console.log(Message.notLoggedIn)

	const env = require(envFilePath)
	// check if last login is older than 24h
	if (env.lastLogin < Date.now() - (60 * 60 * 1000)) return console.log(Message.oldToken)

	console.log("Username: "+ env.username.white)

	let tokenAge = parseInt((Date.now() - env.lastLogin) / 60000, 10)
	console.log("Token age: "+ `${tokenAge}h`.white)
}
