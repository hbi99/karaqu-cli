
import cliFormat from "cli-format";
import * as karaqu from "./index.mjs"

let help = async () => {
	/*
		aliases: --help, -h
		description: Displays this help.
	*/
	
	console.log("\nUsage: karaqu "+ "<options>".white +"\n");

	Object.keys(karaqu)
		.filter(key => key !== "aliases")
		.map(key => {
			let fnBody = karaqu[key].toString(),
				start = fnBody.indexOf("/*") + 2,
				end = fnBody.indexOf("*/"),
				decl = fnBody.slice(start, end).trim().replace(/\t/g, "").split("\n"),
				line = [{ width: 9, content: key }];

			line.push({ width: 15, content: decl[0].split(": ")[1] });
			line.push({ width: 50, content: decl[1].split(": ")[1].gray });

			let result = cliFormat.columns.wrap(line);
			console.log(result);
		});

};

export { help };
