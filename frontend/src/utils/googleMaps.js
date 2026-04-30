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
	onInputChange,
}) {
	if (!container || !window.google?.maps?.places) {
		return () => {};
	}

	container.innerHTML = "";

	const placesApi = window.google.maps.places;
	const canUseElement = Boolean(placesApi.PlaceAutocompleteElement);

	if (!canUseElement) {
		const input = document.createElement("input");
		input.type = "text";
		input.className =
			"h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#FFD600]";
		if (placeholder) {
			input.placeholder = placeholder;
		}

		container.appendChild(input);

		if (!placesApi.Autocomplete) {
			const handleInputFallback = (event) => {
				onInputChange?.(String(event?.target?.value || ""));
			};
			input.addEventListener("input", handleInputFallback);
			return () => {
				input.removeEventListener("input", handleInputFallback);
				if (container.contains(input)) {
					container.removeChild(input);
				}
			};
		}

		const autocomplete = new placesApi.Autocomplete(input, {
			fields: ["place_id", "formatted_address", "name", "geometry"],
			types: ["geocode"],
			componentRestrictions: { country: "in" },
		});

		const handleInputFallback = (event) => {
			onInputChange?.(String(event?.target?.value || ""));
		};
		input.addEventListener("input", handleInputFallback);

		const placeListener = autocomplete.addListener("place_changed", () => {
			const place = autocomplete.getPlace();
			const lat = place?.geometry?.location?.lat?.();
			const lng = place?.geometry?.location?.lng?.();

			onPlaceSelected?.({
				id: readStringValue(place?.place_id),
				displayName: readStringValue(place?.name),
				formattedAddress:
					readStringValue(place?.formatted_address) ||
					readStringValue(place?.name),
				lat: Number.isFinite(lat) ? lat : null,
				lng: Number.isFinite(lng) ? lng : null,
			});
		});

		return () => {
			input.removeEventListener("input", handleInputFallback);
			if (placeListener?.remove) {
				placeListener.remove();
			}
			if (container.contains(input)) {
				container.removeChild(input);
			}
		};
	}

	const autocompleteElement =
		new window.google.maps.places.PlaceAutocompleteElement();
	autocompleteElement.className = "h-11 w-full";
	try {
		autocompleteElement.includedRegionCodes = ["in"];
	} catch {
		// Ignore in case the current Places widget version doesn't support this option.
	}
	if (placeholder) {
		autocompleteElement.setAttribute("placeholder", placeholder);
	}

	const handlePlaceSelect = async (event) => {
		const place = event?.placePrediction?.toPlace?.();
		if (!place) return;

		await place.fetchFields({
				fields: [
					"id",
					"displayName",
					"formattedAddress",
					"location",
					"addressComponents",
				],
		});

		const lat = place?.location?.lat?.();
		const lng = place?.location?.lng?.();

		onPlaceSelected?.({
			id: readStringValue(place?.id),
			displayName: readStringValue(place?.displayName),
			formattedAddress: readStringValue(place?.formattedAddress),
			lat: Number.isFinite(lat) ? lat : null,
			lng: Number.isFinite(lng) ? lng : null,
				addressComponents: Array.isArray(place?.addressComponents)
					? place.addressComponents
					: [],
		});
	};

	const handleInput = (event) => {
		const nextValue = String(event?.target?.value || "");
		onInputChange?.(nextValue);
	};

	autocompleteElement.addEventListener("gmp-select", handlePlaceSelect);
	autocompleteElement.addEventListener("gmp-placeselect", handlePlaceSelect);
	autocompleteElement.addEventListener("input", handleInput);
	container.appendChild(autocompleteElement);

	return () => {
		autocompleteElement.removeEventListener("gmp-select", handlePlaceSelect);
		autocompleteElement.removeEventListener(
			"gmp-placeselect",
			handlePlaceSelect,
		);
		autocompleteElement.removeEventListener("input", handleInput);
		if (container.contains(autocompleteElement)) {
			container.removeChild(autocompleteElement);
		}
	};
}
