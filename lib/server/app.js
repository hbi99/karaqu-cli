
const bodyParser = require("body-parser")
const express = require("express")
const port = process.env.PORT || 40110

module.exports = {
	start(wd, port, ns, id) {
		return new Promise((resolve, reject) => {
			const app = express()

			app.use(bodyParser.json())
			app.use(bodyParser.urlencoded({ extended: true }))

			// routes
			require("./misc/routes")(app, wd, ns, id)

			app.listen(port, () => resolve(app))
		})
	}
}
