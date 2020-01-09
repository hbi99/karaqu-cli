require("dotenv").config()

const path = require("path")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const compression = require("compression")
const express = require("express")

const app = express()
const port = process.env.PORT || 40110

// enable compression
app.enable("etag")
app.use(compression())
//app.use(express.static(path.join(__dirname, "public"), {index: ["index.htm"]}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

// routes
require("./routes")(app)

app.listen(port, () => {
	console.log("Express app started on port " + port)
})
