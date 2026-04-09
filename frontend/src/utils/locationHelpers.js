import { loadGoogleMapsPlaces } from "./googleMaps";

const STORAGE_LOCATION_LABEL_KEY = "selectedLocation";
const STORAGE_LOCATION_COORDS_KEY = "selectedLocationCoords";
const STORAGE_LOCATION_PLACE_ID_KEY = "selectedLocationPlaceId";
export const LOCATION_UPDATED_EVENT = "dealpost:location-changed";

export const hasValidCoordinates = (lat, lng) =>
	Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

export const mapAutocompletePlaceToLocation = (
	place,
	fallbackAddress = "",
) => ({
	address: place?.formattedAddress || place?.displayName || fallbackAddress,
	latitude: hasValidCoordinates(place?.lat, place?.lng)
		? String(place.lat)
		: "",
	longitude: hasValidCoordinates(place?.lat, place?.lng)
		? String(place.lng)
		: "",
	placeId: String(place?.id || ""),
});

export async function loadGoogleMapsFromPublicConfig(apiClient) {
	const { data } = await apiClient.get("/config/public");
	const key = data?.googleMapsBrowserApiKey;
	await loadGoogleMapsPlaces(key);
	return true;
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
		const out = [];
		for (const rows of groups) {
			for (const row of rows || []) {
				if (!row?.id || seen.has(row.id)) continue;
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

export function getStoredLocationLabel() {
	return localStorage.getItem(STORAGE_LOCATION_LABEL_KEY) || "";
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

export function persistStoredLocation({ location, lat, lng, placeId }) {
	if (typeof location === "string") {
		localStorage.setItem(STORAGE_LOCATION_LABEL_KEY, location);
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
			},
		}),
	);
}

export function clearStoredLocationCoords() {
	sessionStorage.removeItem(STORAGE_LOCATION_COORDS_KEY);
	sessionStorage.removeItem(STORAGE_LOCATION_PLACE_ID_KEY);
	window.dispatchEvent(
		new CustomEvent(LOCATION_UPDATED_EVENT, {
			detail: {
				location: getStoredLocationLabel(),
				lat: null,
				lng: null,
				placeId: "",
			},
		}),
	);
}
