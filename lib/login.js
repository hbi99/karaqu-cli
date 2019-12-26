
module.exports = async () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Def-ant and set your credentials.
	*/
	const { prompt } = require("enquirer");

	const form = [{
			type: "input",
			name: "username",
			message: `Please enter your ${"Def-ant".white} username`,
		}, {
			type: "password",
			name: "password",
			message: "Password",
		}]
	
	const response = await prompt(form);

	console.log(response);
}
