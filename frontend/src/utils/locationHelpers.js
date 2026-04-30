import api from "../api/axios";

const STORAGE_LOCATION_LABEL_KEY = "selectedLocation";
const STORAGE_LOCATION_COORDS_KEY = "selectedLocationCoords";
const STORAGE_LOCATION_PLACE_ID_KEY = "selectedLocationPlaceId";
const STORAGE_LOCATION_DETAILS_KEY = "selectedLocationDetails";
const REVERSE_GEOCODE_CACHE_PRECISION = 4;
const REVERSE_GEOCODE_CACHE_TTL_MS = 5 * 60 * 1000;
const reverseGeocodeCache = new Map();
const reverseGeocodeInFlight = new Map();

export const LOCATION_UPDATED_EVENT = "dealpost:location-changed";
let googleMapsModulePromise = null;

async function loadGoogleMapsModule() {
	if (!googleMapsModulePromise) {
		googleMapsModulePromise = import("./googleMaps.js");
	}

	return googleMapsModulePromise;
}

const isCoordinateLikeValue = (value) => {
	if (value == null) return false;
	if (typeof value === "string" && value.trim() === "") return false;
	return Number.isFinite(Number(value));
};

const toFiniteNumber = (value) => {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const getAddressComponentsArray = (addressComponents) =>
	Array.isArray(addressComponents)
		? addressComponents
		: Array.isArray(addressComponents?.address_components)
			? addressComponents.address_components
			: [];

const readAddressComponent = (components, wantedTypes) =>
	components.find((component) =>
		wantedTypes.every((type) => component.types?.includes(type)),
	);

const getReverseGeocodeCacheKey = (lat, lng) =>
	`${Number(lat).toFixed(REVERSE_GEOCODE_CACHE_PRECISION)}:${Number(
		lng,
	).toFixed(REVERSE_GEOCODE_CACHE_PRECISION)}`;

export const hasValidCoordinates = (lat, lng) =>
	isCoordinateLikeValue(lat) && isCoordinateLikeValue(lng);

export function parseAddressComponents(addressComponents = []) {
	const components = getAddressComponentsArray(addressComponents);
	const areaComponent =
		readAddressComponent(components, ["sublocality_level_1"]) ||
		readAddressComponent(components, ["sublocality"]) ||
		readAddressComponent(components, ["neighborhood"]) ||
		readAddressComponent(components, ["administrative_area_level_3"]);
	const cityComponent =
		readAddressComponent(components, ["locality"]) ||
		readAddressComponent(components, ["postal_town"]) ||
		readAddressComponent(components, ["administrative_area_level_2"]) ||
		readAddressComponent(components, ["administrative_area_level_1"]);
	const stateComponent = readAddressComponent(components, [
		"administrative_area_level_1",
	]);
	const postalComponent = readAddressComponent(components, ["postal_code"]);
	const routeComponent = readAddressComponent(components, ["route"]);
	const streetNumberComponent = readAddressComponent(components, [
		"street_number",
	]);

	const area = String(areaComponent?.long_name || "").trim();
	const city = String(cityComponent?.long_name || "").trim();
	const state = String(stateComponent?.long_name || "").trim();
	const pincode = String(postalComponent?.long_name || "").trim();
	const route = String(routeComponent?.long_name || "").trim();
	const streetNumber = String(streetNumberComponent?.long_name || "").trim();
	const street =
		[streetNumber, route].filter(Boolean).join(" ").trim() || route;

	return {
		area,
		city,
		state,
		pincode,
		street,
	};
}

export function formatStructuredAddress(parts = {}) {
	const area = String(parts?.area || "").trim();
	const city = String(parts?.city || "").trim();
	const state = String(parts?.state || "").trim();
	const street = String(parts?.street || "").trim();

	const primary = area || street;
	const secondary = city || state;

	if (
		primary &&
		secondary &&
		primary.toLowerCase() !== secondary.toLowerCase()
	) {
		return `${primary}, ${secondary}`;
	}

	if (primary) return primary;
	if (secondary) return secondary;
	return String(parts?.pincode || "").trim();
}

function normalizeStructuredLocation(location = {}) {
	const lat = toFiniteNumber(location?.lat);
	const lng = toFiniteNumber(location?.lng);
	const area = String(location?.area || "").trim();
	const city = String(location?.city || "").trim();
	const state = String(location?.state || "").trim();
	const pincode = String(location?.pincode || "").trim();
	const street = String(location?.street || "").trim();
	const displayAddress =
		String(location?.displayAddress || location?.address || "").trim() ||
		formatStructuredAddress({ area, city, state, street }) ||
		String(location?.formattedAddress || "").trim();

	return {
		lat,
		lng,
		area,
		city,
		state,
		pincode,
		street,
		displayAddress,
		formattedAddress:
			String(location?.formattedAddress || "").trim() || displayAddress,
		placeId: String(location?.placeId || location?.id || "").trim(),
		addressComponents: Array.isArray(location?.addressComponents)
			? location.addressComponents
			: [],
	};
}

export function getDistanceMeters(fromLocation, toLocation) {
	const fromLat = toFiniteNumber(fromLocation?.lat);
	const fromLng = toFiniteNumber(fromLocation?.lng);
	const toLat = toFiniteNumber(toLocation?.lat);
	const toLng = toFiniteNumber(toLocation?.lng);

	if (
		!Number.isFinite(fromLat) ||
		!Number.isFinite(fromLng) ||
		!Number.isFinite(toLat) ||
		!Number.isFinite(toLng)
	) {
		return null;
	}

	const earthRadiusMeters = 6371000;
	const toRadians = (value) => (value * Math.PI) / 180;
	const deltaLat = toRadians(toLat - fromLat);
	const deltaLng = toRadians(toLng - fromLng);
	const a =
		Math.sin(deltaLat / 2) ** 2 +
		Math.cos(toRadians(fromLat)) *
			Math.cos(toRadians(toLat)) *
			Math.sin(deltaLng / 2) ** 2;

	return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function shouldReverseGeocodeLocation({
	previousLocation,
	nextLocation,
	thresholdMeters = 75,
} = {}) {
	if (!nextLocation) return false;
	if (!previousLocation) return true;
	const distance = getDistanceMeters(previousLocation, nextLocation);
	if (distance === null) return true;
	return distance >= Number(thresholdMeters || 0);
}

export function mapAutocompletePlaceToLocation(place, fallbackAddress = "") {
	const structured = parseAddressComponents(
		place?.addressComponents || place?.address_components || [],
	);
	const displayAddress =
		formatStructuredAddress(structured) ||
		place?.formattedAddress ||
		place?.formatted_address ||
		place?.displayName ||
		place?.name ||
		fallbackAddress;

	return {
		address: displayAddress,
		displayAddress,
		formattedAddress:
			String(
				place?.formattedAddress || place?.formatted_address || "",
			).trim() || displayAddress,
		latitude: hasValidCoordinates(place?.lat, place?.lng)
			? String(place.lat)
			: "",
		longitude: hasValidCoordinates(place?.lat, place?.lng)
			? String(place.lng)
			: "",
		placeId: String(place?.id || place?.placeId || ""),
		area: structured.area,
		city: structured.city,
		state: structured.state,
		pincode: structured.pincode,
		street: structured.street,
		addressComponents:
			place?.addressComponents || place?.address_components || [],
	};
}

export async function loadGoogleMapsFromPublicConfig(apiClient) {
	const { data } = await apiClient.get("/config/public");
	const key = data?.googleMapsBrowserApiKey;
	const { loadGoogleMapsPlaces } = await loadGoogleMapsModule();
	await loadGoogleMapsPlaces(key);
	return true;
}

export async function reverseGeocodeLocation({ lat, lng, placeId = "" }) {
	const latitude = toFiniteNumber(lat);
	const longitude = toFiniteNumber(lng);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		throw new Error("Valid latitude and longitude are required");
	}

	const cacheKey = getReverseGeocodeCacheKey(latitude, longitude);
	const cached = reverseGeocodeCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return normalizeStructuredLocation(cached.value);
	}

	const inFlight = reverseGeocodeInFlight.get(cacheKey);
	if (inFlight) {
		return inFlight;
	}

	const request = (async () => {
		const { data } = await api.post("/config/location/reverse-geocode", {
			lat: latitude,
			lng: longitude,
			placeId: String(placeId || "").trim(),
		});

		const normalized = normalizeStructuredLocation(
			data?.location || data || {},
		);
		reverseGeocodeCache.set(cacheKey, {
			expiresAt: Date.now() + REVERSE_GEOCODE_CACHE_TTL_MS,
			value: normalized,
		});

		return normalized;
	})();

	reverseGeocodeInFlight.set(cacheKey, request);

	try {
		return await request;
	} finally {
		reverseGeocodeInFlight.delete(cacheKey);
	}
}

export async function mountDeferredPlaceAutocompleteElement(options) {
	const { mountPlaceAutocompleteElement } = await loadGoogleMapsModule();
	return mountPlaceAutocompleteElement(options);
}

export async function fetchOpenStreetSuggestions(query, options = {}) {
	const value = String(query || "").trim();
	if (value.length < 3) return [];
	const limit = Number(options.limit || 6);

	const searchNominatim = async ({ countrycodes } = {}) => {
		const params = new URLSearchParams({
			q: value,
			format: "jsonv2",
			addressdetails: "1",
			"accept-language": "en",
			limit: String(limit),
		});

		if (countrycodes) {
			params.set("countrycodes", countrycodes);
		}

		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?${params.toString()}`,
			{
				headers: { Accept: "application/json" },
				signal: options.signal,
			},
		);

		if (!response.ok) {
			throw new Error("Location lookup failed");
		}

		const data = await response.json();
		if (!Array.isArray(data)) return [];

		return data
			.map((item) => {
				const lat = Number(item?.lat);
				const lng = Number(item?.lon);
				if (!hasValidCoordinates(lat, lng)) return null;
				return {
					id: String(item?.place_id || `${lat}:${lng}`),
					label: item?.display_name || "",
					lat,
					lng,
				};
			})
			.filter(Boolean);
	};

	const isIndianLabel = (label) =>
		/(?:,\s*|\b)(india|bharat)\b/i.test(String(label || ""));

	const mergeUniqueById = (...groups) => {
		const seen = new Set();
		const seenLabels = new Set();
		const out = [];
		for (const rows of groups) {
			for (const row of rows || []) {
				if (!row?.id || seen.has(row.id)) continue;
				const label = String(row?.label || "")
					.trim()
					.toLowerCase();
				if (label && seenLabels.has(label)) continue;
				if (label) seenLabels.add(label);
				seen.add(row.id);
				out.push(row);
				if (out.length >= limit) return out;
			}
		}
		return out;
	};

	const indiaFirst = await searchNominatim({ countrycodes: "in" });
	if (indiaFirst.length >= limit) {
		return indiaFirst.slice(0, limit);
	}

	const global = await searchNominatim();
	const globalIndian = global.filter((item) => isIndianLabel(item?.label));
	const globalNonIndian = global.filter((item) => !isIndianLabel(item?.label));

	return mergeUniqueById(indiaFirst, globalIndian, globalNonIndian);
}

export function getStoredLocationDetails() {
	try {
		const raw = localStorage.getItem(STORAGE_LOCATION_DETAILS_KEY);
		if (!raw) return normalizeStructuredLocation({});
		return normalizeStructuredLocation(JSON.parse(raw));
	} catch {
		return normalizeStructuredLocation({});
	}
}

export function getStoredLocationLabel() {
	const storedDetails = getStoredLocationDetails();
	return (
		localStorage.getItem(STORAGE_LOCATION_LABEL_KEY) ||
		storedDetails.displayAddress ||
		storedDetails.formattedAddress ||
		""
	);
}

export function getStoredLocationCoords() {
	try {
		const raw = sessionStorage.getItem(STORAGE_LOCATION_COORDS_KEY);
		if (!raw) return { lat: null, lng: null };

		const parsed = JSON.parse(raw);
		const lat = Number(parsed?.lat);
		const lng = Number(parsed?.lng);
		if (!hasValidCoordinates(lat, lng)) {
			return { lat: null, lng: null };
		}

		return { lat, lng };
	} catch {
		return { lat: null, lng: null };
	}
}

export function persistStoredLocation({
	location,
	displayAddress,
	formattedAddress,
	lat,
	lng,
	placeId,
	area,
	city,
	state,
	pincode,
	street,
	addressComponents,
}) {
	const structuredLocation = normalizeStructuredLocation({
		lat,
		lng,
		placeId,
		area,
		city,
		state,
		pincode,
		street,
		displayAddress,
		formattedAddress,
		address: location,
		addressComponents,
	});

	const storageLabel =
		structuredLocation.displayAddress ||
		String(location || "").trim() ||
		structuredLocation.formattedAddress ||
		"";

	if (storageLabel) {
		localStorage.setItem(STORAGE_LOCATION_LABEL_KEY, storageLabel);
	} else {
		localStorage.removeItem(STORAGE_LOCATION_LABEL_KEY);
	}

	if (storageLabel || hasValidCoordinates(lat, lng)) {
		localStorage.setItem(
			STORAGE_LOCATION_DETAILS_KEY,
			JSON.stringify(structuredLocation),
		);
	} else {
		localStorage.removeItem(STORAGE_LOCATION_DETAILS_KEY);
	}

	if (hasValidCoordinates(lat, lng)) {
		sessionStorage.setItem(
			STORAGE_LOCATION_COORDS_KEY,
			JSON.stringify({ lat: Number(lat), lng: Number(lng) }),
		);
		if (placeId) {
			sessionStorage.setItem(STORAGE_LOCATION_PLACE_ID_KEY, String(placeId));
		} else {
			sessionStorage.removeItem(STORAGE_LOCATION_PLACE_ID_KEY);
		}
		window.dispatchEvent(
			new CustomEvent(LOCATION_UPDATED_EVENT, {
				detail: {
					location: getStoredLocationLabel(),
					lat: Number(lat),
					lng: Number(lng),
					placeId: placeId ? String(placeId) : "",
					area: structuredLocation.area,
					city: structuredLocation.city,
					state: structuredLocation.state,
					pincode: structuredLocation.pincode,
					street: structuredLocation.street,
					displayAddress: structuredLocation.displayAddress,
					formattedAddress: structuredLocation.formattedAddress,
				},
			}),
		);
		return;
	}

	sessionStorage.removeItem(STORAGE_LOCATION_COORDS_KEY);
	sessionStorage.removeItem(STORAGE_LOCATION_PLACE_ID_KEY);
	window.dispatchEvent(
		new CustomEvent(LOCATION_UPDATED_EVENT, {
			detail: {
				location: getStoredLocationLabel(),
				lat: null,
				lng: null,
				placeId: "",
				area: structuredLocation.area,
				city: structuredLocation.city,
				state: structuredLocation.state,
				pincode: structuredLocation.pincode,
				street: structuredLocation.street,
				displayAddress: structuredLocation.displayAddress,
				formattedAddress: structuredLocation.formattedAddress,
			},
		}),
	);
}

export function clearStoredLocationCoords() {
	sessionStorage.removeItem(STORAGE_LOCATION_COORDS_KEY);
	sessionStorage.removeItem(STORAGE_LOCATION_PLACE_ID_KEY);
	localStorage.removeItem(STORAGE_LOCATION_DETAILS_KEY);
	window.dispatchEvent(
		new CustomEvent(LOCATION_UPDATED_EVENT, {
			detail: {
				location: getStoredLocationLabel(),
				lat: null,
				lng: null,
				placeId: "",
				area: "",
				city: "",
				state: "",
				pincode: "",
				street: "",
				displayAddress: "",
				formattedAddress: "",
			},
		}),
	);
}
