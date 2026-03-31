const measurementId = String(
	import.meta.env.VITE_GA_MEASUREMENT_ID || "",
).trim();
let initialized = false;

function isBrowser() {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

function appendGtagScript(id) {
	if (
		document.querySelector(
			`script[src*="googletagmanager.com/gtag/js?id=${id}"]`,
		)
	) {
		return;
	}

	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
	document.head.appendChild(script);
}

export function initGoogleAnalytics() {
	if (!isBrowser() || !measurementId || initialized) {
		return Boolean(initialized);
	}

	appendGtagScript(measurementId);

	window.dataLayer = window.dataLayer || [];
	window.gtag =
		window.gtag ||
		function gtag() {
			window.dataLayer.push(arguments);
		};

	window.gtag("js", new Date());
	window.gtag("config", measurementId, {
		send_page_view: false,
		anonymize_ip: true,
	});

	initialized = true;
	return true;
}

export function trackPageView(path) {
	if (!isBrowser() || !measurementId || typeof window.gtag !== "function") {
		return;
	}

	window.gtag("event", "page_view", {
		page_title: document.title,
		page_location: window.location.href,
		page_path: path,
	});
}
