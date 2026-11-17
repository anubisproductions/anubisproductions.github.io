/* The service worker that makes this page installable, and nothing more.

   A browser will not offer "add to home screen" for a page without one, so
   this exists to satisfy that and to get out of the way. It deliberately
   caches NOTHING.

   The obvious thing to do here is cache the build for offline play, and it is
   the wrong thing to do today. The export is nine and a half megabytes of
   wasm, a cached copy would go stale the moment the game is rebuilt, and a
   stale copy of a game is worse than no copy: the player sees an old version
   with no way to know it, and no amount of reloading fixes it. Offline play
   is what the Android app is for.

   So: a fetch handler that passes everything straight through, and a worker
   that replaces itself immediately when a new one is published. If offline
   play is ever wanted here, it needs a versioned cache keyed to the build and
   a way to tell the player an update has arrived, which is a feature, not a
   line of code. */

self.addEventListener("install", function () {
	// Do not wait for every open tab to close before this worker takes over.
	self.skipWaiting();
});

self.addEventListener("activate", function (event) {
	// Take control of pages that were already open, and drop any cache a
	// previous version of this file might have left behind.
	event.waitUntil(
		caches.keys()
			.then(function (names) {
				return Promise.all(names.map(function (n) { return caches.delete(n); }));
			})
			.then(function () { return self.clients.claim(); })
	);
});

self.addEventListener("fetch", function (event) {
	// Present, as the browser requires, and transparent.
	event.respondWith(fetch(event.request));
});
