
module.exports = async () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Def-ant and obtain a token that will be used to identify you and your application.
	*/
	const fs = require("fs")
	const request = require("request")
	const { prompt } = require("enquirer")
	const config = require("./config")

	const fields = [{
			type: "input",
			name: "username",
			message: `Please enter your ${"Def-ant".white} username`,
		}, {
			type: "password",
			name: "password",
			message: "Password",
		}]
	
	const form = await prompt(fields)
	const url = `${config.authServer}/user/token/create`

	request.post({ url, form }, (err, resp, body) => {
			switch (resp.statusCode) {
				case 200:
					let data = {
						username: form.username,
						token: body
					}
					fs.writeFile(config.envFile, JSON.stringify(data), "utf8", err => {
						if (err) throw err
						console.log("Token obtained")
					})
					break
				default:
					console.log("Login failed, plase try again".red)
			}
		})
}
