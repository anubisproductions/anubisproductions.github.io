/* Offering the home screen, and counting whether anyone takes it.

   The page became installable and said nothing about it, which installs for
   nobody: Chrome buries "Add to Home screen" in a menu almost no one opens,
   and Safari has no prompt at all. So this asks, once, and then never again.

   When it asks matters more than how. On arrival the visitor has not played
   anything yet and the answer is no, the same way it is no for every banner
   that appears before a page has earned it. So the offer waits until someone
   has been here a full minute, which on this page means they are playing.

   What it is careful NOT to claim: offline. The service worker caches nothing
   on purpose, so an installed copy still needs a connection to load. What it
   actually buys is a launcher icon and a full screen with no browser chrome,
   so that is what the words say. Offline is what the Android app is for, and
   the store button is right there for anyone who wants it. */

(function () {
	var KEY = "anubis-install";
	var CONSENT = "anubis-consent";
	var WAIT_MS = 60000;

	function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
	function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

	function track(name, extra) {
		if (typeof window.gtag !== "function") { return; }
		var p = extra || {};
		p.surface = location.hostname;
		window.gtag("event", name, p);
	}

	/* Already installed and launched from the home screen. Worth counting on
	   its own: it is the only way to tell an installed player apart from a
	   browser one, and whether they come back. */
	var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
		|| window.navigator.standalone === true;
	if (standalone) {
		track("app_open_standalone");
		return;
	}

	if (get(KEY)) { return; }

	var deferred = null;
	var ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
		&& /safari/i.test(navigator.userAgent)
		&& !/crios|fxios|edgios/i.test(navigator.userAgent);
	var armed = false;

	window.addEventListener("beforeinstallprompt", function (e) {
		// Keep the event. Chrome only lets prompt() run from one it gave us.
		e.preventDefault();
		deferred = e;
		arm();
	});

	window.addEventListener("appinstalled", function () {
		set(KEY, "installed");
		track("app_installed");
		var bar = document.getElementById("install-bar");
		if (bar) { bar.remove(); }
	});

	function arm() {
		if (armed) { return; }
		armed = true;
		setTimeout(ready, WAIT_MS);
	}

	function ready() {
		if (get(KEY)) { return; }
		// One bar at a time. The consent strip owns the bottom of the screen
		// until it has been answered, and two stacked bars over a game is how
		// a page gets closed rather than read.
		if (!get(CONSENT)) { setTimeout(ready, 10000); return; }
		show();
	}

	function show() {
		if (document.getElementById("install-bar")) { return; }
		var bar = document.createElement("div");
		bar.id = "install-bar";
		bar.setAttribute("role", "region");
		bar.setAttribute("aria-label", "Add to home screen");
		bar.style.cssText = [
			"position:fixed", "left:0", "right:0", "bottom:0", "z-index:2147482000",
			"background:#12100c", "color:#e8d6a6",
			"border-top:1px solid rgba(212,175,55,0.35)",
			"box-shadow:0 -10px 30px rgba(0,0,0,0.45)",
			"font-family:Georgia,'Times New Roman',serif", "font-size:14px",
			"line-height:1.45", "padding:12px 16px",
			"display:flex", "flex-wrap:wrap", "gap:10px 14px",
			"align-items:center", "justify-content:center"
		].join(";");

		var text = document.createElement("p");
		text.style.cssText = "margin:0;flex:1 1 260px;max-width:560px;color:#a2957a";
		text.textContent = ios
			? "Keep Hashi on your home screen: tap Share, then Add to Home Screen. It opens full screen, with no browser bars."
			: "Keep Hashi on your home screen. It opens full screen, with no browser bars.";
		bar.appendChild(text);

		if (!ios) {
			var yes = document.createElement("button");
			yes.type = "button";
			yes.textContent = "Add to home screen";
			yes.style.cssText = [
				"cursor:pointer", "border:0", "border-radius:999px", "padding:8px 18px",
				"background:#d4af37", "color:#12100c", "font-family:inherit",
				"font-size:14px", "font-weight:700", "letter-spacing:0.02em",
				"white-space:nowrap"
			].join(";");
			yes.addEventListener("click", function () {
				if (!deferred) { return; }
				deferred.prompt();
				deferred.userChoice.then(function (choice) {
					track(choice.outcome === "accepted" ? "install_accepted" : "install_declined");
					// Declining is an answer. Asking again after one is how a
					// prompt becomes the reason somebody leaves.
					set(KEY, choice.outcome);
					deferred = null;
					bar.remove();
				});
			});
			bar.appendChild(yes);
		}

		var no = document.createElement("button");
		no.type = "button";
		no.setAttribute("aria-label", "No thanks");
		no.textContent = ios ? "Got it" : "No thanks";
		no.style.cssText = [
			"cursor:pointer", "border:1px solid rgba(212,175,55,0.35)",
			"border-radius:999px", "padding:8px 16px", "background:transparent",
			"color:#d4af37", "font-family:inherit", "font-size:14px",
			"font-weight:700", "white-space:nowrap"
		].join(";");
		no.addEventListener("click", function () {
			set(KEY, "dismissed");
			track("install_dismissed");
			bar.remove();
		});
		bar.appendChild(no);

		document.body.appendChild(bar);
		track("install_offer_shown", { offer_kind: ios ? "ios_hint" : "prompt" });
	}

	// Safari never fires beforeinstallprompt, so the iOS hint runs on its own
	// clock rather than waiting for an event that is not coming.
	if (ios) { arm(); }
})();
