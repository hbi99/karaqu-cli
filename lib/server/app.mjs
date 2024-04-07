
import express from "express";
import bodyParser from "body-parser";
import Cache from "./misc/cache.mjs";
import proxy from "./misc/routes.mjs";


let Server = async (wd, port=8080, ns, id) => {
	let state = { server: null, sockets: [] };
	let __dirname = new URL(import.meta.url +"/..").pathname;

	let devServer = {
		start() {
			let app = express();
			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({ extended: true }));
			// routes
			proxy(app, wd, ns, id);
			// reference to server
			state.server = app.listen(port);
			// collect sockets
			state.server.on("connection", socket => state.sockets.push(socket));
		},
		async restart() {
			// close all sockets
			state.sockets.forEach(socket => socket.destroy());
			// clean the cache
			await Cache.clear(`index.htm`);
			await Cache.clear(`ledger.${global.version}.xml`);
			// restart server
			state.server.close(() => {
				console.log("Karaqu Development Server restarted on port: ", port);
				devServer.start();
			});
		}
	}

	// auto start
	devServer.start();

	return devServer;
};


export default Server;
