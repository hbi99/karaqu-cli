
module.exports = async () => {
	/*
		aliases: --publish, -p
		description: Once logged in, you can publish your application to be used by everyone in Def-ant.
	*/
	const fs = require("fs")
	const request = require("request")
	const config = require("./config")
	
	const envFile = require("../"+ config.envFile)


	const url = `${config.appServer}/app/ant/test`
	const headers = { authorization: "Bearer "+ envFile.token }
	const formData = {
			file: fs.createReadStream(__dirname + "/../index.xml"),
		};

	request.post({ url, headers, formData }, (err, resp, body) => {
			if (err) throw err;
			switch (resp.statusCode) {
				case 401:
					console.log("Authentication failed".red +"\nTry to login again")
					break;
				case 200:
					console.log(body);
					break;
			}
		});
}

/*
	let ProgressBar = require("progress")
	let bar = new ProgressBar("[:bar] :percent", { total: 20 })
	let timer = setInterval(() => {
			bar.tick()
			if (bar.complete) {
				clearInterval(timer)
			}
		}, 100)
*/
