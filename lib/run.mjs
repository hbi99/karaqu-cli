
import open from "open";
import chokidar from "chokidar";
import Server from "./server/app.mjs";
import Cache from "./server/misc/cache.mjs";
import { FS, Message, Token } from "./common.mjs";
import { Build } from "karaqu-builder";


let run = async (wd, port) => {
	/*
		aliases: --run, -r
		description: Using this option, you can develop individual applications detached from the online Karaqu service. Specify path and port when using this option. Example; karaqu run . 8080
	*/

	if (!wd || !port) {
		return console.log(Message.specifySrcPort);
	}

	let __dirname = new URL(import.meta.url +"/..").pathname;
	let buildOptions = { uglify: false, compress: true };
	let source = FS.path.join(process.cwd(), wd);
	let destination = FS.path.join(process.cwd(), wd, "_build" || "");
	let appIndex = FS.path.join(source, "index.xml");

	if (!await FS.fileExists(appIndex)) {
		return console.log(Message.noAppIndex);
	}

	// build application, create server & start
	Build({ ...buildOptions, source, destination })
		.then(async build => {
			// conditional "run require" checks
			for (let key in build.runRequires) {
				let description = build.runRequires[key];
				
				switch (key) {
					case "login":
						let token = await Token.validate();
						if (!token) return console.log((description || Message.runRequiresLogin).red);
						break;
					case "oauth":
						if (!build.files.includes("oauth-credentials.json")) {
							return console.log((description || Message.runRequiresOauth).red);
						}
						break;
				}
			}

			let server = await Server(destination, port, build.namespace, build.id);
			console.log(`Started Karaqu application on port: ${port}`);

			// discard "old" ledger, if any
			let cachedFiles = await FS.listDir(FS.path.join(__dirname, "server/_cache/"));
			if (cachedFiles) {
				cachedFiles.map(async file => {
					if (file.includes("\/ledger.") && file.endsWith(".xml")) {
						await FS.unlink(file);
					}
				});
			}

			// watch server files
			let serverSrc = FS.path.join(__dirname, "server");
			let ignoreSrc = FS.path.join(__dirname, "server/_cache");
			chokidar.watch(serverSrc, { ignored: [ignoreSrc +"/**/*"] }).on("change", path => server.restart());

			// open browser
			let spawn = await open(`http://localhost:${port}`, { app: ["google chrome", "--auto-open-devtools-for-tabs"] });

			// watch changes in source folder
			chokidar.watch(source, { ignored: [destination +"/**/*"] }).on("change", async path => {
				if (~path.indexOf(".git")) return;
				console.log(`Rebuilt ${build.name.white} v${build.version}`);
				await Build({ ...buildOptions, source, destination, purge: true });
			})

			//** execute when proecess is killed
			process.on("SIGINT", async () => {
				// try to kill opened browser tab
				spawn.kill("SIGINT");

				// delete build folder
				await FS.deleteDir(destination);
				// cleanse cache
				await Cache.clear(`index.htm`);
				await Cache.clear(`ledger.${global.version}.xml`);
				await Cache.clear(`serviceWorker.${global.version}.js`);
				await Cache.clear(`main.${global.version}.js`);
				// exit shell command
				process.exit();
			})
		})
		.catch(error => {
			// build proecure returned error
			console.log(error.red);
		});
};


export { run };
