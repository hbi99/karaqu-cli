
import { FS } from "./common.mjs";


let version = async () => {
	/*
		aliases: --version, -v
		description: Displays version of this tool.
	*/

	let file = await FS.readFile("package.json");
	let PKG = JSON.parse(file.toString());

	console.log("\nkaraqu-cli: version "+ PKG.version.white);
	console.log("karaqu-builder: version "+ PKG.dependencies["karaqu-builder"].slice(1).white +"\n");
};


export { version };
