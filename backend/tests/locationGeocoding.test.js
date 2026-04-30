import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "server-test-key");
vi.stubEnv("GOOGLE_MAPS_GEOCODING_CACHE_TTL_MS", "600000");

const sampleGoogleResponse = {
	status: "OK",
	results: [
		{
			place_id: "sample-place-id",
			formatted_address: "Anna Nagar West, Chennai, Tamil Nadu, India",
			types: ["street_address"],
			address_components: [
				{
					long_name: "Anna Nagar West",
					short_name: "Anna Nagar West",
					types: ["sublocality", "political"],
				},
				{
					long_name: "Chennai",
					short_name: "Chennai",
					types: ["locality", "political"],
				},
				{
					long_name: "Tamil Nadu",
					short_name: "TN",
					types: ["administrative_area_level_1", "political"],
				},
				{
					long_name: "600040",
					short_name: "600040",
					types: ["postal_code"],
				},
				{
					long_name: "Poonamallee High Road",
					short_name: "Poonamallee High Road",
					types: ["route"],
				},
			],
		},
	],
};

describe("locationGeocoding service", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	it("parses address components and formats a compact address", async () => {
		const { formatStructuredAddress, parseAddressComponents } = await import(
			"../src/services/locationGeocoding.js",
		);

		const parsed = parseAddressComponents(sampleGoogleResponse.results[0].address_components);
		expect(parsed).toEqual({
			area: "Anna Nagar West",
			city: "Chennai",
			state: "Tamil Nadu",
			pincode: "600040",
			street: "Poonamallee High Road",
		});
		expect(formatStructuredAddress(parsed)).toBe("Anna Nagar West, Chennai");
	});

	it("reverse geocodes and caches rounded coordinates", async () => {
		const fetchSpy = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => sampleGoogleResponse,
		});
		global.fetch = fetchSpy;

		const { clearReverseGeocodeCache, reverseGeocodeLocation } = await import(
			"../src/services/locationGeocoding.js",
		);

		clearReverseGeocodeCache();

		const first = await reverseGeocodeLocation({ lat: 13.0827, lng: 80.2707 });
		expect(first).toMatchObject({
			lat: 13.0827,
			lng: 80.2707,
			area: "Anna Nagar West",
			city: "Chennai",
			state: "Tamil Nadu",
			pincode: "600040",
			displayAddress: "Anna Nagar West, Chennai",
			placeId: "sample-place-id",
			cacheHit: false,
		});
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		const second = await reverseGeocodeLocation({ lat: 13.08271, lng: 80.27069 });
		expect(second.cacheHit).toBe(true);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});