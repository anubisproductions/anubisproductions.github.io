/* Anubis Productions site measurement.

   One file, loaded by every page. It runs in this order on purpose:

   1. Tells Google's consent framework that nothing is granted. This executes
      before the tag itself loads, so there is no moment in which the tag may
      write a cookie.
   2. Loads the tag anyway. Under a denied consent state it sends a cookieless
      ping: we learn a page was viewed, and nothing is written to the
      visitor's device.
   3. Asks. Accepting upgrades the same tag to its ordinary mode. Declining
      leaves it cookieless for good. The answer is remembered so the strip is
      shown once.

   The strip is built here rather than written into the HTML because the web
   build frame does not load style.css and still has to ask the same question. */

(function () {
	var ID = "G-5WH4QVJZF0";
	var KEY = "anubis-consent";

	/* The thing worth keeping out is a copy served from a laptop: testing these
	   pages locally had already put four page views and two users into the
	   property. So this refuses the local cases by name rather than listing the
	   hosts that are allowed.

	   Listing the allowed hosts was the first attempt and it was wrong: the
	   build uploaded to itch loads this same file from our domain, and itch
	   serves an HTML project from a host of its own choosing, today
	   html-classic.itch.zone and at other times a CDN name. Naming them would
	   mean the itch build stops reporting the day itch changes one. */
	var host = location.hostname;
	var local =
		location.protocol === "file:" ||
		host === "" ||
		host === "localhost" ||
		host === "127.0.0.1" ||
		host === "::1" ||
		host === "[::1]" ||
		/(^|\.)local$/.test(host) ||
		/(^|\.)localhost$/.test(host) ||
		/^192\.168\./.test(host) ||
		/^10\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host);
	if (local) { return; }

	window.dataLayer = window.dataLayer || [];
	function gtag() { dataLayer.push(arguments); }
	window.gtag = gtag;

	/* Denied first, and wait_for_update holds the tag briefly so a stored
	   "granted" below lands before the first hit rather than after it. */
	gtag("consent", "default", {
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "denied",
		wait_for_update: 500
	});

	var stored = null;
	try { stored = localStorage.getItem(KEY); } catch (e) { stored = null; }

	if (stored === "granted") {
		gtag("consent", "update", { analytics_storage: "granted" });
	}

	var s = document.createElement("script");
	s.async = true;
	s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
	document.head.appendChild(s);

	gtag("js", new Date());
	gtag("config", ID, { anonymize_ip: true });

	/* Every link out to the store is counted, on whichever page it sits. The
	   listener is on the document rather than on each link so a page that gains
	   a button later needs no change here, and so the frame page, whose link is
	   written inline, is covered by the same code. */
	document.addEventListener("click", function (ev) {
		var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
		if (!a) { return; }
		var href = a.href || "";
		if (href.indexOf("play.google.com/store/apps") < 0) { return; }
		var campaign = "";
		var m = href.match(/utm_campaign%3D([^%&]+)/);
		if (m) { campaign = decodeURIComponent(m[1]); }
		gtag("event", "store_click", {
			link_url: href,
			store_campaign: campaign || "untagged",
			surface: host
		});
	}, true);

	if (stored) { return; }

	function remember(value) {
		try { localStorage.setItem(KEY, value); } catch (e) {}
	}

	function ask() {
		var bar = document.createElement("div");
		bar.setAttribute("role", "region");
		bar.setAttribute("aria-label", "Measurement");
		bar.style.cssText = [
			"position:fixed", "left:0", "right:0", "bottom:0", "z-index:2147483000",
			"background:#12100c", "color:#e8d6a6",
			"border-top:1px solid rgba(212,175,55,0.35)",
			"box-shadow:0 -10px 30px rgba(0,0,0,0.45)",
			"font-family:Georgia,'Times New Roman',serif", "font-size:14px",
			"line-height:1.5", "padding:14px 18px",
			"display:flex", "flex-wrap:wrap", "gap:10px 16px",
			"align-items:center", "justify-content:center"
		].join(";");

		var text = document.createElement("p");
		text.style.cssText = "margin:0;flex:1 1 320px;max-width:640px;color:#a2957a";
		text.innerHTML =
			"We count visits with Google Analytics. Until you say otherwise it runs " +
			"cookieless: no cookie, nothing kept on your device. Accepting allows the " +
			"one cookie that tells a return visit from a new one. " +
			'<a href="/privacy/hashi.html#site" style="color:#d4af37">What we measure</a>.';

		function button(label, primary) {
			var b = document.createElement("button");
			b.type = "button";
			b.textContent = label;
			b.style.cssText = [
				"cursor:pointer", "border-radius:999px", "padding:8px 18px",
				"font-family:inherit", "font-size:14px", "font-weight:700",
				"letter-spacing:0.02em", "white-space:nowrap",
				primary ? "background:#d4af37" : "background:transparent",
				primary ? "color:#12100c" : "color:#d4af37",
				primary ? "border:0" : "border:1px solid rgba(212,175,55,0.35)"
			].join(";");
			return b;
		}

		var yes = button("Accept", true);
		var no = button("Keep it cookieless", false);

		yes.addEventListener("click", function () {
			gtag("consent", "update", { analytics_storage: "granted" });
			remember("granted");
			bar.remove();
		});
		no.addEventListener("click", function () {
			remember("denied");
			bar.remove();
		});

		bar.appendChild(text);
		bar.appendChild(yes);
		bar.appendChild(no);
		document.body.appendChild(bar);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", ask);
	} else {
		ask();
	}
})();
