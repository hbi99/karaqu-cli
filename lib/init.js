
module.exports = async () => {
	/*
		aliases: --init, -i
		description: When starting a new application use this option to create a empty scaffold application. Useful for quick start.
	*/
	const { prompt } = require("enquirer");

	const form = [{
			type: "input",
			name: "username",
			message: `Please enter the name of your application`,
		}, {
			type: "input",
			name: "version",
			message: "Version",
			initial: "1.0.0",
		}, {
			type: "input",
			name: "license",
			message: "License",
			initial: "AGPL-3.0",
		}]
	
	const response = await prompt(form);

	console.log(response);
}
