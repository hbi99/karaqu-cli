
module.exports = async () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Defiant and obtain a token that will be used to identify you and your application.
	*/
	const request = require("request")
	const { prompt } = require("enquirer")
	const { FS, Message } = require("./common")
	const cfg = require("./cfg")

	const fields = [{
			type: "input",
			name: "username",
			message: `Please enter your ${"Defiant".white} username`,
		}, {
			type: "password",
			name: "password",
			message: "Password",
		}]
	
	const form = await prompt(fields)
	const url = `${cfg.authServer}/user/token/create`

	request.post({ url, form }, async (err, resp, body) => {
			switch (resp.statusCode) {
				case 200:
					let data = {
						username: form.username,
						lastLogin: Date.now(),
						token: body,
					}
					let envFile = FS.path.join(__dirname, cfg.envFile)
					await FS.writeFile(envFile, JSON.stringify(data), "utf8")
					console.log(Message.tokenSuccess)
					break
				default:
					console.log(Message.authFail)
			}
		})
}
