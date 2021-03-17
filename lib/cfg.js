const join = require("path").join
const path = join(__dirname, "..", ".env")
require("dotenv").config({ path })

module.exports = {
	tokenTTL: 60 * 60 * 1000,
	antServer: process.env.ANT_SERVER_URL || "https://www.def-ant.com",
	appServer: process.env.APP_SERVER_URL || "https://www.def-ant.com",
	authServer: process.env.AUTH_SERVER_URL || "https://www.def-ant.com",
}
