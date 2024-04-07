
import colors from "colors";

import { help } from "./help.mjs";
import { version } from "./version.mjs";
import { config } from "./config.mjs";
import { init } from "./init.mjs";
import { run } from "./run.mjs";
import { login } from "./login.mjs";
import { publish } from "./publish.mjs";
// import "self" to get exposed commands
import * as karaqu from "./index.mjs";


let aliases = () => {
	let manual = {};
	
	Object.keys(karaqu)
		.filter(key => key !== "aliases")
		.map(key => {
			let line = karaqu[key].toString().match(/aliases:(.+)$/mi);
			manual[key] = line[1].trim().split(",").map(a => a.trim());
		});

	return manual;
};

export { aliases, help, version, config, init, run, login, publish };
