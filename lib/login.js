
module.exports = async () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Defiant and obtain a token that will be used to identify you and your application.
	*/
	const fetch = require("node-fetch")
	const { prompt } = require("enquirer")
	const { FS, Message, Token } = require("./common")
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
	const body = new URLSearchParams();
	Object.keys(form).map(key => body.append(key, form[key]))

	const url = `${cfg.authServer}/user/token/create`
	const req = await fetch(url, { method: "POST", body })

	if (req.status === 200) {
		// save token info
		await Token.save({
			username: form.username,
			lastLogin: Date.now(),
			token: await req.text(),
		})

		console.log(Message.tokenSuccess)
	} else {
		console.log(Message.authFail)
	}
}
