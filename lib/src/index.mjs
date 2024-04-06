
import colors from "colors";

import { help } from "./help.mjs"
import { version } from "./version.mjs"
import { config } from "./config.mjs"
import { init } from "./init.mjs"
import { run } from "./run.mjs"
import { login } from "./login.mjs"
import { publish } from "./publish.mjs"

let aliases = () => {
	let manual = {};
	let exp = ["help", "version", "config", "init", "run", "login", "publish"];

	// Object.keys(exp).map(fn => {
	// 	if (fn === "aliases") return;
	// 	let line = exp[fn].toString().match(/aliases:(.+)$/mi);
	// 	manual[fn] = line[1].trim().split(",").map(a => a.trim());
	// });

	return manual;
};

export { aliases, help, version, config, init, run, login, publish };
