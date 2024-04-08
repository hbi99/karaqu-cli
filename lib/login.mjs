
import Enquirer from "enquirer";
import { FS, Message, Token } from "./common.mjs";
import { CFG } from "./cfg.mjs";


let login = async () => {
	/*
		aliases: --login, -l
		description: In order to publish your application, you need to login to Karaqu and obtain a token that will be used to identify you and your application.
	*/

	let fields = [{
			type: "input",
			name: "username",
			message: `Please enter your ${"Karaqu".white} username`,
		}, {
			type: "password",
			name: "password",
			message: "Password",
		}];

	let form = await Enquirer.prompt(fields);
	let body = new URLSearchParams();
	Object.keys(form).map(key => body.append(key, form[key]));

	let url = `${CFG.authServer}/user/token/create`;
	let req = await fetch(url, { method: "POST", body });

	if (req.status === 200) {
		// save token info
		await Token.save({
			username: form.username,
			lastLogin: Date.now(),
			token: await req.text(),
		});

		console.log(Message.tokenSuccess);
	} else {
		console.log(Message.authFail);
	}
};


export { login };
