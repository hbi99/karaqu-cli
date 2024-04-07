
import { Token } from "./common.mjs";


let config = async () => {
	/*
		aliases: --config, -c
		description: Displays last saved login information.
	*/

	let token = await Token.validate();
	if (!token) return;

	console.log("Username: "+ token.username.white);

	let tokenAge = Math.round((Date.now() - token.lastLogin) / 6e4);
	console.log("Token age: "+ `${tokenAge} minutes`.white);

	let refresh = 60 - tokenAge;
	console.log("Token TTL: "+ `${refresh} minutes`.white);
};


export { config };
