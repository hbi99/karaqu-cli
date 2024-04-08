
import fetch from "node-fetch";
import { FormData } from "formdata-polyfill/esm.min.js"
import { File } from "fetch-blob/file.js";
import Progress from "progress";
import { FS, Message, Token } from "./common.mjs";
import { CFG } from "./cfg.mjs";
import { Build } from "karaqu-builder";


let publish = async (src, dest) => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application and it will be available to run in Karaqu online service. Notice that file size limit 5MB and total package size limit is 10MB.
	*/

	let token = await Token.validate();
	// check if file exists
	if (!token) return;

	let cwd = process.cwd();
	let source = FS.path.join(cwd, src || "");
	let destination = FS.path.join(cwd, dest || src || "");
	// prepare build and clean up
	if (source === destination) destination = FS.path.join(destination, "_build");
	if (await FS.fileExists(destination)) await FS.deleteDir(destination);

	// build application
	Build({ source, destination, uglify: true, compress: true })
		.then(async build => {
			// verbose step
			console.log(`Karaqu application ${build.name.white} v${build.version} build.`);

			let files = await FS.listDir(build.buildPath);
			let url = `${CFG.appServer}/app/${token.username}/${build.id}`;
			let headers = { authorization: "Bearer "+ token.token };
			let info = {};

			// calculate package size
			let pckgSize = 0;
			await Promise.all(files.map(async filePath => {
				let stat = await FS.fileStat(filePath);
				info[filePath] = stat.size;
				pckgSize += stat.size;
			}));

			// progress bar
			let barConfig = { complete: "█", incomplete: "░", width: 25, total: pckgSize };
			let bar = new Progress("Uploading :bar :percent", barConfig);

			let body = new FormData();
			files.map(filePath => {
				let size = info[filePath];
				let name = filePath.slice(build.buildPath.length+1);
				let stream = () => FS.org.createReadStream(filePath)
									.on("data", chunk => bar.tick(chunk.length));
				let file = { size, name, stream, [Symbol.toStringTag]: "File" };
				// add entry to form
				body.append("file", file);
			});

			// send files to server
			let result = await fetch(url, { method: "POST", body, headers });

			switch (result.status) {
				case 304:
					console.log(Message.noFiles);
					break;
				case 401:
					console.log(Message.authFail);
					break;
				case 413:
					console.log(Message.packageTooLarge);
					break;
				case 422:
					console.log(Message.uploadFail);
					// console.log(body);
					break;
				case 200:
					// console.log(body);
					break;
			}

			// delete _build folder
			await FS.deleteDir(build.buildPath);
		})
		.catch(err => {
			// delete _build folder
			FS.deleteDir(destination);
		});
};

export { publish };
