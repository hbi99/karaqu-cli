require("dotenv").config()

module.exports = {
	envFile: "env-config.json",
	appServer: process.env.APP_SERVER_URL || "https://def-ant.com",
	authServer: process.env.AUTH_SERVER_URL || "https://def-ant.com",
}
