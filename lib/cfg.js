// require("dotenv").config()
require("dotenv").config({ path: "/Users/hakanbilgin/Documents/GitHub/defiant-cli/.env" })

module.exports = {
	envFile: "env-config.json",
	antServer: process.env.ANT_SERVER_URL || "https://www.def-ant.com",
	appServer: process.env.APP_SERVER_URL || "https://www.def-ant.com",
	authServer: process.env.AUTH_SERVER_URL || "https://www.def-ant.com",
}
