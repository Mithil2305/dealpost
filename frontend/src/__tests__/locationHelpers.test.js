// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearStoredLocationCoords,
	getStoredLocationCoords,
	hasValidCoordinates,
	LOCATION_UPDATED_EVENT,
	formatStructuredAddress,
	parseAddressComponents,
	persistStoredLocation,
} from "../utils/locationHelpers";

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	vi.restoreAllMocks();
});

describe("locationHelpers", () => {
	it("validates coordinates safely", () => {
		expect(hasValidCoordinates(12.9716, 77.5946)).toBe(true);
		expect(hasValidCoordinates("12.9716", "77.5946")).toBe(true);
		expect(hasValidCoordinates(null, 77.5946)).toBe(false);
		expect(hasValidCoordinates("bad", "data")).toBe(false);
	});

	it("parses and formats structured address components", () => {
		const structured = parseAddressComponents([
			{ long_name: "Anna Nagar West", types: ["sublocality_level_1"] },
			{ long_name: "Chennai", types: ["locality"] },
			{ long_name: "Tamil Nadu", types: ["administrative_area_level_1"] },
			{ long_name: "600040", types: ["postal_code"] },
			{ long_name: "7th Street", types: ["route"] },
		]);

		expect(structured).toEqual({
			area: "Anna Nagar West",
			city: "Chennai",
			state: "Tamil Nadu",
			pincode: "600040",
			street: "7th Street",
		});
		expect(formatStructuredAddress(structured)).toBe(
			"Anna Nagar West, Chennai",
		);
	});

	it("persists coordinates and dispatches location update event", () => {
		const listener = vi.fn();
		window.addEventListener(LOCATION_UPDATED_EVENT, listener);

		persistStoredLocation({
			location: "Bengaluru, India",
			lat: 12.9716,
			lng: 77.5946,
			placeId: "test-place-id",
		});

		const coords = getStoredLocationCoords();
		expect(coords).toEqual({ lat: 12.9716, lng: 77.5946 });
		expect(localStorage.getItem("selectedLocation")).toBe("Bengaluru, India");
		expect(sessionStorage.getItem("selectedLocationPlaceId")).toBe(
			"test-place-id",
		);
		expect(listener).toHaveBeenCalledTimes(1);

		window.removeEventListener(LOCATION_UPDATED_EVENT, listener);
	});

	it("clears invalid or removed coordinate storage", () => {
		sessionStorage.setItem("selectedLocationCoords", "{bad json");
		expect(getStoredLocationCoords()).toEqual({ lat: null, lng: null });

		persistStoredLocation({
			location: "No coords",
			lat: null,
			lng: null,
		});
		expect(getStoredLocationCoords()).toEqual({ lat: null, lng: null });

		clearStoredLocationCoords();
		expect(sessionStorage.getItem("selectedLocationCoords")).toBeNull();
		expect(sessionStorage.getItem("selectedLocationPlaceId")).toBeNull();
	});
});
