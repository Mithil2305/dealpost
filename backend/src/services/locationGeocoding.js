import { env } from "../config/env.js";

const CACHE_PRECISION = 4;
const locationCache = new Map();
const inflightRequests = new Map();

function toFiniteNumber(value) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function cacheKeyFor(lat, lng) {
	return `${Number(lat).toFixed(CACHE_PRECISION)}:${Number(lng).toFixed(
		CACHE_PRECISION,
	)}`;
}

function readComponent(components, wantedTypes) {
	return components.find((component) =>
		wantedTypes.every((type) => component.types?.includes(type)),
	);
}

function getCacheTtlMs() {
	const ttlMs = Number(env.GOOGLE_MAPS_GEOCODING_CACHE_TTL_MS || 0);
	return Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 0;
}

export function parseAddressComponents(addressComponents = []) {
	const components = Array.isArray(addressComponents)
		? addressComponents
		: Array.isArray(addressComponents?.address_components)
			? addressComponents.address_components
			: [];

	const areaComponent =
		readComponent(components, ["sublocality_level_1"]) ||
		readComponent(components, ["sublocality"]) ||
		readComponent(components, ["neighborhood"]) ||
		readComponent(components, ["administrative_area_level_3"]);

	const cityComponent =
		readComponent(components, ["locality"]) ||
		readComponent(components, ["postal_town"]) ||
		readComponent(components, ["administrative_area_level_2"]) ||
		readComponent(components, ["administrative_area_level_1"]);

	const stateComponent = readComponent(components, [
		"administrative_area_level_1",
	]);
	const postalComponent = readComponent(components, ["postal_code"]);
	const routeComponent = readComponent(components, ["route"]);
	const streetNumberComponent = readComponent(components, ["street_number"]);

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

function isPreferredGeocodeResult(result) {
	return Boolean(
		result?.types?.some((type) =>
			[
				"street_address",
				"premise",
				"subpremise",
				"route",
				"sublocality",
				"sublocality_level_1",
				"neighborhood",
				"locality",
			].includes(type),
		),
	);
}

function pickBestResult(results = []) {
	if (!Array.isArray(results) || !results.length) return null;
	return results.find(isPreferredGeocodeResult) || results[0] || null;
}

function buildLocationPayload(result, lat, lng) {
	const parsed = parseAddressComponents(result?.address_components);
	const displayAddress =
		formatStructuredAddress(parsed) ||
		String(result?.formatted_address || "").trim() ||
		`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

	return {
		lat: Number(lat),
		lng: Number(lng),
		area: parsed.area,
		city: parsed.city,
		state: parsed.state,
		pincode: parsed.pincode,
		street: parsed.street,
		displayAddress,
		formattedAddress:
			String(result?.formatted_address || "").trim() || displayAddress,
		placeId: String(result?.place_id || "").trim(),
		addressComponents: result?.address_components || [],
	};
}

function getGeocodingApiKey() {
	return String(env.GOOGLE_MAPS_SERVER_API_KEY || "").trim();
}

export async function reverseGeocodeLocation({ lat, lng, placeId = "" } = {}) {
	const latitude = toFiniteNumber(lat);
	const longitude = toFiniteNumber(lng);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		const error = new Error("Valid latitude and longitude are required");
		error.statusCode = 400;
		throw error;
	}

	const key = getGeocodingApiKey();
	if (!key) {
		const error = new Error("Google Maps server API key is not configured");
		error.statusCode = 503;
		throw error;
	}

	const cacheKey = cacheKeyFor(latitude, longitude);
	const cachedEntry = locationCache.get(cacheKey);
	if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
		return { ...cachedEntry.value, cacheHit: true };
	}

	const inflight = inflightRequests.get(cacheKey);
	if (inflight) {
		return inflight;
	}

	const requestPromise = (async () => {
		const endpoint = new URL(
			"https://maps.googleapis.com/maps/api/geocode/json",
		);
		endpoint.search = new URLSearchParams({
			latlng: `${latitude},${longitude}`,
			key,
			language: "en",
		}).toString();

		const response = await fetch(endpoint, { method: "GET" });
		if (!response.ok) {
			const error = new Error("Google Geocoding request failed");
			error.statusCode = 502;
			throw error;
		}

		const data = await response.json();
		if (
			data?.status !== "OK" ||
			!Array.isArray(data?.results) ||
			!data.results.length
		) {
			const error = new Error(
				data?.error_message || "No address found for coordinates",
			);
			error.statusCode = data?.status === "ZERO_RESULTS" ? 404 : 502;
			error.googleStatus = data?.status || "UNKNOWN";
			throw error;
		}

		const preferredResult = pickBestResult(data.results);
		const payload = buildLocationPayload(preferredResult, latitude, longitude);
		payload.placeId = payload.placeId || String(placeId || "").trim();

		const ttlMs = getCacheTtlMs();
		if (ttlMs > 0) {
			locationCache.set(cacheKey, {
				expiresAt: Date.now() + ttlMs,
				value: payload,
			});
		}

		return { ...payload, cacheHit: false };
	})();

	inflightRequests.set(cacheKey, requestPromise);

	try {
		return await requestPromise;
	} finally {
		inflightRequests.delete(cacheKey);
	}
}

export function clearReverseGeocodeCache() {
	locationCache.clear();
	inflightRequests.clear();
}
