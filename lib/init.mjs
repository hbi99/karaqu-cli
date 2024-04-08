
import Enquirer from "enquirer";
import { FS, Token } from "./common.mjs";
import { CFG } from "./cfg.mjs";

const __dirname = new URL(import.meta.url +"/..").pathname;


let init = async () => {
	/*
		aliases: --init, -i
		description: When starting a new application use this option to create a empty scaffold file structure. Useful for quick start.
	*/

	// get username, if any
	let token = await Token.check();

	// json snippet
	let snippet = await Enquirer.snippet({
		message: "Fill out the fields below",
		required: true,
		fields: [
			{ name: "name", },
			{
				name: "id",
				validate(value, state, item, index) {
					if (item && item.name === "id" && value.indexOf(" ") > -1) {
						return prompt.styles.danger("The id should not contain space character");
					}
					return true;
				}
			},
			{ name: "version", },
			{ name: "author", },
			{ name: "username", },
		],
		template: `{
	"name": "\${name:New Application}",
	"id": "\${id:newApplication}",
	"version": "\${version:1.0}",
	"author": "\${author:Firstname Lastname}",
	"username": "\${username:${token.username}}"
}
`});
	
	let data = JSON.parse(snippet.result);
	let sourceDir = FS.path.join(__dirname, "default-app");
	let destDir = process.cwd();

	// copy base file structure for project
	await FS.copyDir(sourceDir, destDir);

	let files = await FS.listDir(destDir);
	await Promise.all(files.map(async filepath => {
		let file = await FS.readFile(filepath);
		file = file.toString();

		for (let key in data) {
			let rx = new RegExp(`\\{\\{${key}\\}\\}`, "mg");
			file = file.replace(rx, data[key]);
		}

		await FS.writeFile(filepath, file);
	}))

	let gitIgnore = FS.path.join(destDir, ".gitIgnore");
	await FS.writeFile(gitIgnore, "\n_build\n.DS_Store\n");

	console.log(`Created file structure for application ${data.name.white} ${data.version}`);
};

export { init };
