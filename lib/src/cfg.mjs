import "dotenv/config";

let CFG =  {
	tokenTTL: 60 * 60 * 1000,
	antServer: process.env.ANT_SERVER_URL || "https://www.karaqu.com",
	appServer: process.env.APP_SERVER_URL || "https://www.karaqu.com",
	authServer: process.env.AUTH_SERVER_URL || "https://www.karaqu.com",
};

export { CFG }
