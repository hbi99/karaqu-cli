
module.exports = async () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Def-ant and obtain a token that will be used to identify you and your application.
	*/
	const fs = require("fs")
	const request = require("request")
	const { prompt } = require("enquirer")
	const config = require("./config")

	const form = [{
			type: "input",
			name: "username",
			message: `Please enter your ${"Def-ant".white} username`,
		}, {
			type: "password",
			name: "password",
			message: "Password",
		}]
	
	const response = await prompt(form)
	const url = `${config.authServer}/user/token/create`

	request.post({ url, form: response}, (error, response, body) => {
	        if (!error && response.statusCode == 200) {
	            fs.writeFile(config.envFile, JSON.stringify({ token: body }), "utf8", err => {
	            	if (err) throw err
	            	console.log("Token obtained")
	            })
	        }
	    })
}
