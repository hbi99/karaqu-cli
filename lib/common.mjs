import "dotenv/config";

import fs from "fs";
import util from "util";
import path from "path";
import mime from "mime";
import { CFG } from "./cfg.mjs";


const Mimes = mime.types;
const __dirname = new URL(import.meta.url +"/..").pathname;


// Message: START
const Message = {
	authFail: "Authentication failed".red +"\nTry to login again",
	uploadFail: "Upload failed.",
	packageTooLarge: "Upload failed".red +"\nMaximum file size is 5M of individual files.\nApplication package should not exceed 15M.",
	notLoggedIn: "You have not logged in yet.\nLogin is required before publishing your application.",
	oldToken: "Your token is too old.\nPlease login to re-new security token.",
	tokenSuccess: "Token obtained",
	specifySrcPort: "You must specify "+ "source folder".underline +" and "+ "port".underline +"\nMake sure that you are in a application folder and try: `karaqu run . 8080`",
	noAppIndex: "The specified folder does not contain `index.xml` file.",
	noFiles: "No files sent",
	noRuntime: "No runtime cached",
	runRequiresLogin: "Login is required to exchange messages other users.",
	runRequiresOauth: "'oauth-credentials.json' is required.",
};
// Message: END


// Token: START
const Token = {
	filePath: "env-config.json",
	async check() {
		let envFilePath = FS.path.join(__dirname, this.filePath);
		let env = { username: "unknown" };
		// check if file exists
		if (await FS.fileExists(envFilePath)) {
			let file = await FS.readFile(envFilePath);
			env = JSON.parse(file.toString());
		}

		return env;
	},
	async validate() {
		// check if file exists
		let envFilePath = FS.path.join(__dirname, this.filePath);
		if (!await FS.fileExists(envFilePath)) return console.log(Message.notLoggedIn.red);

		// check login token age
		let file = await FS.readFile(envFilePath);
		let env = JSON.parse(file.toString());
		if (env.lastLogin < Date.now() - CFG.tokenTTL) return console.log(Message.oldToken.red);

		return env;
	},
	async save(data) {
		let envFilePath = FS.path.join(__dirname, this.filePath);
		await FS.writeFile(envFilePath, JSON.stringify(data), "utf8");
	}
};
// Token: END


// FS: START
const copyDir = async (src, dest) => {
	let list = await FS.readDir(src);
	list = list.filter(f => !f.startsWith("."));
	
	await Promise.all(list.map(async file => {
			let fSrc = FS.path.join(src, file);
			let fDest = FS.path.join(dest, file);
			let exists = await FS.fileExists(fDest);
			let stat = await FS.fileStat(fSrc);

			if (stat.isDirectory()) {
				if (!exists) await FS.mkDir(fDest);
				await copyDir(fSrc, fDest);
			} else {
				await FS.copyFile(fSrc, fDest);
		 	}
		}));
};

const deleteDir = async (dir) => {
	let list = await FS.readDir(dir);

	await Promise.all(list.map(async file => {
			let fPath = FS.path.join(dir, file);
			let stat = await FS.fileStat(fPath);

			if (stat.isDirectory()) {
				await deleteDir(fPath);
			} else {
				await FS.unlink(fPath);
		 	}
		}));
	
	await FS.rmdir(dir);
};

const listDir = async (dir) => {
	let ret = [];
	let list = await FS.readDir(dir);
	list = list.filter(f => !f.startsWith("."));

	await Promise.all(list.map(async file => {
			let fPath = FS.path.join(dir, file);
			let stat = await FS.fileStat(fPath);

			if (stat.isDirectory()) {
				let sub = await listDir(fPath);
				ret = ret.concat(sub);
			} else {
				ret.push(fPath);
		 	}
		}));

	return ret;
};

const pMkdir = util.promisify(fs.mkdir);
const mkDir = async dir => pMkdir(dir, { recursive: true });

const FS = {
	org: fs,
	path,
	mkDir,
	rmdir: util.promisify(fs.rmdir),
	unlink: util.promisify(fs.unlink),
	readDir: util.promisify(fs.readdir),
	readFile: util.promisify(fs.readFile),
	writeFile: util.promisify(fs.writeFile),
	fileExists: util.promisify(fs.exists),
	fileStat: util.promisify(fs.stat),
	copyFile: util.promisify(fs.copyFile),
	listDir,
	copyDir,
	deleteDir,
};
// FS: END


// Karaqu: START
let getIcons = ["icon-karaqu",
				"karaqu-logo",
				"window-close",
				"window-minimize",
				"window-maximize",
				"window-restore",
				"icon-clock",
				"icon-check",
				"icon-plus",
				"icon-magnify",
				"icon-heart",
				"icon-chevron-down",
				"icon-chevron-sort",
				"icon-color-preset",
				"icon-arrow-right",
				"icon-view-icons",
				"icon-view-list",
				"icon-view-columns",
				"icon-view-flow",
				"icon-volume-0",
				"icon-volume-1",
				"icon-volume-2",
				"icon-volume-3",
				"sidebar-home",
				"sidebar-desktop",
				"sidebar-documents",
				"sidebar-applications",
				"sidebar-network",
				"sidebar-shared",
				"sidebar-folder",
				"sidebar-dropbox",
				"sidebar-pcloud",
				"sidebar-box",
				"sidebar-google-drive",
				"tiny-generic-folder",
				"tiny-generic-document"];


const Karaqu = {
	domain: CFG.antServer,
	async getLedger(cfg) {
		// get public version of files
		let url = `${Karaqu.domain}/res/xml/ledger.${global.version}.xml`;
		let result = await fetch(url);
		let body = await result.text();
		let details = body.match(/<details[\s\S]*?<\/details>/gm);
		let templates = body.match(/<xsl:stylesheet[\s\S]*?<\/xsl:stylesheet>/gm);
		let svgIcons = body.match(/<svg id="[\s\S]*?<\/svg>/gm);
		let mimeNode = body.match(/<Mime[\s\S]*?<\/Mime>/gm);
		let shellNode = body.match(/<Shell[\s\S]*?<\/Shell>/gm);
		let langUrl = `${Karaqu.domain}/cdn/i18n/en-en`;
		let langResult = await fetch(langUrl);
		let langText = await langResult.text();
		let filePath = FS.path.join(__dirname, "./server/misc/cli-ledger.xml");
		let data = await FS.readFile(filePath);
		let ledger = data.toString();

		// only get some icons
		svgIcons = svgIcons.filter(icon => {
			let search = false;
			getIcons.map(i => (search = search || icon.includes(i)));
			return search;
		})

		ledger = ledger.replace(/<\/ledger>/, `${details} ${templates}</ledger>`);
		ledger = ledger.replace(/<i18n>\{\{i18n\}\}<\/i18n>/, langText.trim());
		ledger = ledger.replace(/<Mime>\{\{mime-types\}\}<\/Mime>/, mimeNode);
		ledger = ledger.replace(/<Shell>\{\{shell-map\}\}<\/Shell>/, shellNode);
		ledger = ledger.replace(/\{\{svg-icons\}\}/, svgIcons.join(""));
		ledger = ledger.replace(/\{\{app-ns\}\}/, cfg.appNs);
		ledger = ledger.replace(/\{\{app-id\}\}/, cfg.appId);

		// ledger = ledger.replace(/\n\t{1,}/g, "");

		return ledger;
	}
}
// Karaqu: END


export { Message, Token, FS, Mimes, Karaqu };

