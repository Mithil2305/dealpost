import { Loader } from "@googlemaps/js-api-loader";

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

	if (window.google?.maps?.places?.PlaceAutocompleteElement) {
		return Promise.resolve(window.google);
	}

	if (googleMapsPromise) {
		return googleMapsPromise;
	}

	const loader = new Loader({
		apiKey,
		version: "weekly",
		libraries: ["places"],
		language: "en",
	});

	googleMapsPromise = loader
		.load()
		.then(async () => {
			await window.google.maps.importLibrary("places");
			return window.google;
		})
		.catch((error) => {
			googleMapsPromise = null;
			throw error;
		});

	return googleMapsPromise;
}

function readStringValue(value) {
	if (typeof value === "string") return value;
	if (typeof value?.text === "string") return value.text;
	return "";
}

export function mountPlaceAutocompleteElement({
	container,
	placeholder,
	onPlaceSelected,
}) {
	if (!container || !window.google?.maps?.places?.PlaceAutocompleteElement) {
		return () => {};
	}

	container.innerHTML = "";

	const autocompleteElement =
		new window.google.maps.places.PlaceAutocompleteElement();
	autocompleteElement.className = "h-11 w-full";
	if (placeholder) {
		autocompleteElement.setAttribute("placeholder", placeholder);
	}

	const handlePlaceSelect = async (event) => {
		const place = event?.placePrediction?.toPlace?.();
		if (!place) return;

		await place.fetchFields({
			fields: ["id", "displayName", "formattedAddress", "location"],
		});

		const lat = place?.location?.lat?.();
		const lng = place?.location?.lng?.();

		onPlaceSelected?.({
			id: readStringValue(place?.id),
			displayName: readStringValue(place?.displayName),
			formattedAddress: readStringValue(place?.formattedAddress),
			lat: Number.isFinite(lat) ? lat : null,
			lng: Number.isFinite(lng) ? lng : null,
		});
	};

	autocompleteElement.addEventListener("gmp-select", handlePlaceSelect);
	container.appendChild(autocompleteElement);

	return () => {
		autocompleteElement.removeEventListener("gmp-select", handlePlaceSelect);
		if (container.contains(autocompleteElement)) {
			container.removeChild(autocompleteElement);
		}
	};
}
