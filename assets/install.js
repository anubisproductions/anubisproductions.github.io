/* Offering the home screen on every page, and counting whether anyone takes it.

   Two ways of asking, because one page is not like the others.

   Everywhere: a button that appears the moment the browser says the site can
   be installed, sitting with the other links. It interrupts nothing. Somebody
   reading the rules, or looking at a puzzle, can keep the game without first
   finding their way to the board and waiting around on it.

   On the game page only: a bar, after a minute. That page has no chrome at
   all on a phone, the game fills the screen, so there is nowhere to put a
   button; and a minute spent there means the visitor is playing, which is the
   moment the question is worth asking. Asked once, and a no is remembered.

   What this will not claim: offline. The worker caches nothing on purpose, so
   an installed copy still needs a connection to load. What it buys is a
   launcher icon and a full screen with no browser bars, so that is what the
   words say. Offline is what the Android app is for, and the store link is
   never far away. */

(function () {
	/* The worker lives at the site root so it controls every page, not just
	   the game. A browser will not offer an install for a page no worker
	   controls, and the manifest is scoped to the whole site for the same
	   reason. */
	if ("serviceWorker" in navigator) {
		window.addEventListener("load", function () {
			navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
			/* The worker used to live at /play/hashi/sw.js. Moving a worker does
			   not retire the old registration: a different scope is a different
			   worker, so both survive and the narrower one goes on controlling
			   the game page forever. Anyone who loaded the site before the move
			   is carrying one. This retires it on their next visit. */
			navigator.serviceWorker.getRegistrations().then(function (regs) {
				regs.forEach(function (r) {
					if (r.scope !== location.origin + "/") { r.unregister(); }
				});
			}).catch(function () {});
		});
	}

	var KEY = "anubis-install";
	var CONSENT = "anubis-consent";
	var WAIT_MS = 60000;

	function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
	function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

	function track(name, extra) {
		if (typeof window.gtag !== "function") { return; }
		var p = extra || {};
		p.surface = location.pathname;
		window.gtag("event", name, p);
	}

	function buttons() {
		return [].slice.call(document.querySelectorAll("[data-install]"));
	}

	function hideButtons() {
		buttons().forEach(function (b) { b.hidden = true; });
	}

	/* Already installed and launched from the home screen. Worth counting on
	   its own: it is the only way to tell an installed player from a browser
	   one, and whether they come back. */
	var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
		|| window.navigator.standalone === true;
	if (standalone) {
		track("app_open_standalone");
		whenReady(hideButtons);
		return;
	}

	var done = get(KEY);
	if (done === "installed" || done === "accepted") {
		whenReady(hideButtons);
		return;
	}

	var deferred = null;
	var ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
		&& /safari/i.test(navigator.userAgent)
		&& !/crios|fxios|edgios/i.test(navigator.userAgent);
	var gamePage = /\/play\/hashi\//.test(location.pathname);
	var armed = false;

	/* This file is loaded without `defer` for one reason: the browser can fire
	   beforeinstallprompt before a deferred script has run, and an event with
	   no listener is gone for good. The game page hid that bug behind ten
	   seconds of wasm loading; every other page showed it immediately.

	   Everything that touches the DOM therefore waits for DOMContentLoaded;
	   only the listener runs now. */
	window.addEventListener("beforeinstallprompt", function (e) {
		// Keep the event: Chrome only lets prompt() run from one it gave us.
		e.preventDefault();
		deferred = e;
		whenReady(showButtons);
		if (gamePage) { arm(); }
	});

	function whenReady(fn) {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", fn);
		} else {
			fn();
		}
	}

	window.addEventListener("appinstalled", function () {
		set(KEY, "installed");
		track("app_installed");
		hideButtons();
		var bar = document.getElementById("install-bar");
		if (bar) { bar.remove(); }
	});

	function ask() {
		if (!deferred) { return; }
		deferred.prompt();
		deferred.userChoice.then(function (choice) {
			track(choice.outcome === "accepted" ? "install_accepted" : "install_declined");
			if (choice.outcome === "accepted") {
				set(KEY, "accepted");
				hideButtons();
			}
			deferred = null;
			var bar = document.getElementById("install-bar");
			if (bar) { bar.remove(); }
		});
	}

	function showButtons() {
		var list = buttons();
		if (!list.length) { return; }
		list.forEach(function (b) {
			if (!b.hidden) { return; }
			b.hidden = false;
			if (ios) {
				b.addEventListener("click", function () {
					track("install_ios_hint");
					var note = document.createElement("span");
					note.textContent = " Tap Share, then Add to Home Screen.";
					note.style.cssText = "opacity:.85";
					b.replaceWith(note);
				});
			} else {
				b.addEventListener("click", function () { track("install_clicked"); ask(); });
			}
		});
		track("install_button_shown", { offer_kind: ios ? "ios" : "prompt" });
	}

	function arm() {
		if (armed) { return; }
		armed = true;
		setTimeout(ready, WAIT_MS);
	}

	function ready() {
		if (get(KEY)) { return; }
		// One bar at a time. The consent strip owns the bottom of the screen
		// until it is answered, and two stacked bars over a game is how a page
		// gets closed rather than read.
		if (!get(CONSENT)) { setTimeout(ready, 10000); return; }
		showBar();
	}

	function showBar() {
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
			yes.addEventListener("click", ask);
			bar.appendChild(yes);
		}

		var no = document.createElement("button");
		no.type = "button";
		no.textContent = ios ? "Got it" : "No thanks";
		no.style.cssText = [
			"cursor:pointer", "border:1px solid rgba(212,175,55,0.35)",
			"border-radius:999px", "padding:8px 16px", "background:transparent",
			"color:#d4af37", "font-family:inherit", "font-size:14px",
			"font-weight:700", "white-space:nowrap"
		].join(";");
		no.addEventListener("click", function () {
			// Dismissing the bar silences the bar, not the buttons. The buttons
			// interrupt nothing, so there is nothing to forgive them for.
			set(KEY, "dismissed");
			track("install_dismissed");
			bar.remove();
		});
		bar.appendChild(no);

		document.body.appendChild(bar);
		track("install_offer_shown", { offer_kind: ios ? "ios_hint" : "prompt" });
	}

	// Safari never fires beforeinstallprompt, so iOS runs on its own clock
	// rather than waiting for an event that is not coming.
	if (ios) {
		whenReady(showButtons);
		if (gamePage) { arm(); }
	}
})();
