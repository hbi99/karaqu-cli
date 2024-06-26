#!/usr/bin/env node
"use strict";

import * as karaqu from "../lib/index.mjs"

let aliases = karaqu.aliases();
let args = process.argv.splice(2);
let cmd = aliases[args[0]] ? args[0] : false;

if (!cmd) {
	Object.keys(aliases).map(c =>
		cmd ? false : aliases[c].map(a =>
			a === args[0] ? cmd = c : false
		));
}

// command not found - show help
if (!cmd) karaqu.help();
// call function and pass on arguments
else karaqu[cmd].apply(karaqu, args.slice(1));
