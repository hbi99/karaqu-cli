
module.exports = async () => {
	/*
		aliases: --config, -c
		description: Displays last saved login information.
	*/
	const { Token } = require("./common")
	const token = await Token.validate()
	if (!token) return

	console.log("Username: "+ token.username.white)

	let tokenAge = Math.round((Date.now() - token.lastLogin) / 60000)
	console.log("Token age: "+ `${tokenAge} minutes`.white)

	let refresh = 60 - tokenAge
	console.log("Token TTL: "+ `${refresh} minutes`.white)
}
