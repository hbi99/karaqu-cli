#!/usr/bin/env node
"use strict";

let defiant = require("../lib")
let aliases = defiant.aliases()
let args = process.argv.splice(2)
let cmd = aliases[args[0]] ? args[0] : false

if (!cmd) {
	Object.keys(aliases).map(c =>
		cmd ? false : aliases[c].map(a =>
			a === args[0] ? cmd = c : false
		))
}

// command not found - show help
if (!cmd) return defiant.help()

// call function and pass on arguments
defiant[cmd].apply(defiant, args.slice(1))
