
const { FS } = require("../common")
const bodyParser = require("body-parser")
const express = require("express")
const port = process.env.PORT || 8080


module.exports = function(wd, port, ns, id) {
	
	let state = {
		server: null,
		sockets: [],
	}

	let devServer = {
		start() {
			let app = express()
			app.use(bodyParser.json())
			app.use(bodyParser.urlencoded({ extended: true }))
			// routes
			require("./misc/routes")(app, wd, ns, id)
			// reference to server
			state.server = app.listen(port)
			// collect sockets
			state.server.on("connection", socket => state.sockets.push(socket))
		},
		restart() {
			// close all sockets
			state.sockets.forEach(socket => socket.destroy())
			// clean the cache
			Object.keys(require.cache).forEach(id => {
				// console.log(id)
				if (id.startsWith(__dirname)) {
					// console.log("Reloading", id);
					delete require.cache[id];
				}
			})
			// restart server
			state.server.close(() => {
				console.log("Karaqu Development Server restarted on port: ", port)
				devServer.start()
			})
		}
	}

	// auto start
	devServer.start()

	return devServer;

}
