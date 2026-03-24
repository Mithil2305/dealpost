let googleMapsPromise = null;

export function loadGoogleMapsPlaces(apiKey) {
	if (typeof window === "undefined") {
		return Promise.reject(
			new Error("Google Maps can only load in the browser"),
		);
	}

	if (!apiKey) {
		return Promise.reject(new Error("Missing Google Maps browser API key"));
	}

	if (window.google?.maps?.places) {
		return Promise.resolve(window.google);
	}

	if (googleMapsPromise) {
		return googleMapsPromise;
	}

	googleMapsPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector(
			'script[data-google-maps="places"]',
		);

		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(window.google));
			existingScript.addEventListener("error", () => {
				reject(new Error("Failed to load Google Maps script"));
			});
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
		script.async = true;
		script.defer = true;
		script.dataset.googleMaps = "places";
		script.onload = () => resolve(window.google);
		script.onerror = () =>
			reject(new Error("Failed to load Google Maps Places API"));
		document.head.appendChild(script);
	});

	return googleMapsPromise;
}
