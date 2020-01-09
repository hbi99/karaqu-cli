
const CACHE_NAME = "def-ant-v1";
const CACHE_PATHS = [];


self.addEventListener("install", event => {
	//event.waitUntil(self.clients.claim());
	event.waitUntil(caches.open(CACHE_NAME));
});


self.addEventListener("activate", event => {
	event.waitUntil(
		caches.keys().then(cacheNames => Promise.all(
			cacheNames.map(cache => cache !== CACHE_NAME ? caches.delete(cache) : false)
		))
	);
});


self.addEventListener("fetch", event => {
	if (event.request.method === "POST") {
		return event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
	}

	if (CACHE_PATHS.find(i => ~event.request.url.indexOf(i))) {
		return event.respondWith(caches.match(event.request));
	}

	event.respondWith(
		fetch(event.request)
			.then(res => {
				let resClone = res.clone();
				caches
					.open(CACHE_NAME)
					.then(cache => {
						cache.put(event.request, resClone);
					});

				return res;
			}).catch(err => caches.match(event.request).then(res => res))
	);
});


// dispatch for message receiver
function dispatch(event) {
	switch (event.data.type) {
		case "clear-cache":
			caches.keys().then(cacheNames =>
				Promise.all(cacheNames.map(cache => caches.delete(cache))));
			// empty cache paths
			CACHE_PATHS = [];
			break;
		case "cache-icons":
			let app = event.data.app,
				last = event.data.icons.length - 1;

			event.data.icons.map(async (icon, i) => {
				let path = (app ? `/app/ant/${app}/icons/` : "/ant/icons/") + icon.name +".png";

				if (icon.forceRefresh || CACHE_PATHS.indexOf(path) < 0) {
					let req = new Request(path),
						blob = new Blob([icon.svg], {type: "image/svg+xml"}),
						resp = new Response(blob);

					CACHE_PATHS.push(path);
					let cache = await caches.open(CACHE_NAME);
					await cache.put(req, resp);
				}

				if (i === last) sendMessage({type: "icons-cached", ticket: event.data.ticket});
			});
			break;
	}
}

self.addEventListener("message", dispatch);


// send message pipe
function sendMessage(msg) {
	self.clients.matchAll().then(clients =>
		clients.forEach(client => client.postMessage({msg})));
}

