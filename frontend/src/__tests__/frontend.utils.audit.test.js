// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCreateElement = document.createElement.bind(document);

async function importFresh(path) {
	vi.resetModules();
	return import(path);
}

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unmock("../utils/googleMaps");
	vi.unmock("../api/axios");
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	document.createElement = originalCreateElement;
});

describe("frontend utility audit", () => {
	it("covers pickArray helper", async () => {
		const { pickArray } = await importFresh("../utils/api.js");
		expect(pickArray([1, 2])).toEqual([1, 2]);
		expect(pickArray({ data: [3, 4] })).toEqual([3, 4]);
		expect(pickArray({ items: [5] })).toEqual([5]);
		expect(pickArray({ payload: { data: [9] } }, ["payload"])).toEqual([9]);
		expect(pickArray({ foo: "bar" })).toEqual([]);
	});

	it("covers GSTIN normalization and validation helpers", async () => {
		const { normalizeGstin, hasValidGstinChecksum, isValidGstin } =
			await importFresh("../utils/gstin.js");
		const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const base14 = "29AABCU9603R1Z";
		const validWithChecksum = charset
			.split("")
			.map((character) => `${base14}${character}`)
			.find((value) => hasValidGstinChecksum(value));

		expect(normalizeGstin(" 29aabcu9603r1zv ")).toBe("29AABCU9603R1ZV");
		expect(isValidGstin("29AABCU9603R1ZV")).toBe(true);
		expect(isValidGstin("invalid-gstin")).toBe(false);
		expect(Boolean(validWithChecksum)).toBe(true);
		expect(hasValidGstinChecksum(validWithChecksum)).toBe(true);
		expect(hasValidGstinChecksum("29AABCU9603R1ZA")).toBe(false);
		expect(isValidGstin("29AABCU9603R1ZA", { requireChecksum: true })).toBe(
			false,
		);
		expect(isValidGstin(validWithChecksum, { requireChecksum: true })).toBe(
			true,
		);
	});

	it("covers message notification storage helpers", async () => {
		const { getUnreadConversationCount, markConversationSeen, readSeenMap } =
			await importFresh("../utils/messageNotifications.js");

		expect(readSeenMap()).toEqual({});
		markConversationSeen("42", "2026-04-10T10:00:00.000Z");
		expect(readSeenMap()).toMatchObject({ 42: "2026-04-10T10:00:00.000Z" });
		markConversationSeen("42", "2026-04-10T09:00:00.000Z");
		expect(readSeenMap()).toMatchObject({ 42: "2026-04-10T10:00:00.000Z" });

		const rows = [
			{
				id: 42,
				lastMessage: {
					senderId: 100,
					createdAt: "2026-04-10T11:00:00.000Z",
				},
			},
			{
				id: 77,
				lastMessage: {
					senderId: 5,
					createdAt: "2026-04-10T11:00:00.000Z",
				},
			},
		];

		expect(getUnreadConversationCount(rows, 5)).toBe(1);
	});

	it("covers ad slot storage helpers", async () => {
		const {
			createAdSlot,
			getActiveAdSlots,
			getAdSlots,
			removeAdSlot,
			updateAdSlot,
		} = await importFresh("../utils/adSlots.js");

		const initial = getAdSlots();
		expect(Array.isArray(initial)).toBe(true);
		expect(initial.length).toBeGreaterThan(0);

		const created = createAdSlot({
			title: "  New Ad  ",
			description: "  Desc ",
			imageUrl: " https://example.com/a.png ",
			targetUrl: " /offers ",
			isActive: true,
		});
		expect(created.title).toBe("New Ad");
		expect(getAdSlots()[0].id).toBe(created.id);

		updateAdSlot(created.id, { title: "  Updated  ", isActive: false });
		const updated = getAdSlots().find((row) => row.id === created.id);
		expect(updated.title).toBe("Updated");
		expect(updated.isActive).toBe(false);
		expect(getActiveAdSlots()).not.toContainEqual(
			expect.objectContaining({ id: created.id }),
		);

		removeAdSlot(created.id);
		expect(getAdSlots().find((row) => row.id === created.id)).toBeUndefined();
	});

	it("covers likes utility helpers and API wrappers", async () => {
		const mockApi = {
			get: vi.fn().mockResolvedValue({
				data: { listings: [{ id: 1 }, { _id: 2 }, { id: "bad" }] },
			}),
			post: vi.fn().mockResolvedValue({
				data: { likedByCount: 9, likedListingIds: [1, 2] },
			}),
			delete: vi
				.fn()
				.mockResolvedValue({ data: { likedByCount: 3, likedListingIds: [2] } }),
		};
		vi.doMock("../api/axios", () => ({ default: mockApi }));

		const {
			fetchMyLikedListingIds,
			getListingIdentifier,
			getListingLikedCount,
			getListingNumericId,
			isListingLiked,
			updateListingLikeStatus,
		} = await importFresh("../utils/likes.js");

		expect(getListingNumericId({ id: "10" })).toBe(10);
		expect(getListingNumericId({ listingId: 8 })).toBe(8);
		expect(getListingIdentifier({ productId: "p1", id: 1 })).toBe("p1");
		expect(getListingLikedCount({ likedByCount: "7" })).toBe(7);
		expect(isListingLiked({ id: 4 }, [1, "4", 9])).toBe(true);
		expect(isListingLiked({ id: 6 }, [1, "4", 9])).toBe(false);
		expect(await fetchMyLikedListingIds()).toEqual([1, 2]);

		expect(
			await updateListingLikeStatus({ listing: { id: 12 }, isLiked: false }),
		).toEqual({ isLiked: true, likedByCount: 9, likedListingIds: [1, 2] });
		expect(mockApi.post).toHaveBeenCalledWith("/listings/12/like");

		expect(
			await updateListingLikeStatus({ listing: { _id: 12 }, isLiked: true }),
		).toEqual({ isLiked: false, likedByCount: 3, likedListingIds: [2] });
		expect(mockApi.delete).toHaveBeenCalledWith("/listings/12/like");
	});

	it("covers sponsored ad API wrappers", async () => {
		const mockApi = {
			get: vi
				.fn()
				.mockResolvedValueOnce({
					data: { ads: [{ id: 1 }], googleAdsSnippet: "<script></script>" },
				})
				.mockResolvedValueOnce({ data: { items: [{ id: 2 }] } })
				.mockResolvedValueOnce({
					data: { data: [{ id: 9 }], total: "10", page: "2", pages: "5" },
				})
				.mockResolvedValueOnce({ data: { googleAdsSnippet: "abc" } }),
			post: vi.fn().mockResolvedValue({ data: { ad: { id: 22 } } }),
			patch: vi.fn().mockResolvedValue({ data: { ad: { id: 33 } } }),
			put: vi
				.fn()
				.mockResolvedValue({ data: { googleAdsSnippet: "new-script" } }),
			delete: vi.fn().mockResolvedValue({}),
		};
		vi.doMock("../api/axios", () => ({ default: mockApi }));

		const sponsoredAds = await importFresh("../utils/sponsoredAds.js");

		expect(await sponsoredAds.getPublicSponsoredAds({ city: "blr" })).toEqual({
			ads: [{ id: 1 }],
			googleAdsSnippet: "<script></script>",
		});
		expect(await sponsoredAds.getMySponsoredAds()).toEqual([{ id: 2 }]);
		expect(await sponsoredAds.createSponsoredAd({ title: "x" })).toEqual({
			id: 22,
		});
		expect(await sponsoredAds.updateSponsoredAd(1, { title: "y" })).toEqual({
			id: 33,
		});
		await sponsoredAds.deleteSponsoredAd(9);

		expect(await sponsoredAds.getAdminSponsoredAds()).toEqual({
			ads: [{ id: 9 }],
			total: 10,
			page: 2,
			pages: 5,
		});
		expect(await sponsoredAds.createAdminSponsoredAd({ title: "x" })).toEqual({
			id: 22,
		});
		expect(
			await sponsoredAds.updateAdminSponsoredAd(2, { active: true }),
		).toEqual({ id: 33 });
		await sponsoredAds.deleteAdminSponsoredAd(2);
		expect(await sponsoredAds.getAdminGoogleAdsSnippet()).toBe("abc");
		expect(await sponsoredAds.saveAdminGoogleAdsSnippet(" next ")).toBe(
			"new-script",
		);
	});

	it("covers location helper mapping, config loading, and suggestions", async () => {
		const loadGoogleMapsPlaces = vi.fn().mockResolvedValue({ maps: {} });
		vi.doMock("../utils/googleMaps", () => ({ loadGoogleMapsPlaces }));
		const {
			fetchOpenStreetSuggestions,
			loadGoogleMapsFromPublicConfig,
			mapAutocompletePlaceToLocation,
		} = await importFresh("../utils/locationHelpers.js");

		const mapped = mapAutocompletePlaceToLocation(
			{
				id: 1,
				displayName: "MG Road",
				formattedAddress: "Bengaluru",
				lat: 12.9,
				lng: 77.6,
			},
			"fallback",
		);
		expect(mapped).toEqual({
			address: "Bengaluru",
			latitude: "12.9",
			longitude: "77.6",
			placeId: "1",
		});
		expect(mapAutocompletePlaceToLocation({}, "fallback")).toMatchObject({
			address: "fallback",
			latitude: "",
			longitude: "",
		});

		const apiClient = {
			get: vi
				.fn()
				.mockResolvedValue({ data: { googleMapsBrowserApiKey: "test-key" } }),
		};
		expect(await loadGoogleMapsFromPublicConfig(apiClient)).toBe(true);
		expect(loadGoogleMapsPlaces).toHaveBeenCalledWith("test-key");

		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						place_id: "1",
						display_name: "MG Road, India",
						lat: "12.9",
						lon: "77.6",
					},
				],
			})
			.mockResolvedValueOnce({ ok: true, json: async () => [] });
		const suggestions = await fetchOpenStreetSuggestions("bengaluru");
		expect(suggestions).toEqual([
			{ id: "1", label: "MG Road, India", lat: 12.9, lng: 77.6 },
		]);
		expect(await fetchOpenStreetSuggestions("ab")).toEqual([]);
	});

	it("covers google maps loader and autocomplete mount fallbacks", async () => {
		vi.doUnmock("../utils/googleMaps");
		const loaderLoad = vi.fn().mockResolvedValue({});
		vi.doMock("@googlemaps/js-api-loader", () => ({
			Loader: vi.fn().mockImplementation(() => ({ load: loaderLoad })),
		}));

		const { loadGoogleMapsPlaces, mountPlaceAutocompleteElement } =
			await importFresh("../utils/googleMaps");

		await expect(loadGoogleMapsPlaces("")).rejects.toThrow(
			"Missing Google Maps browser API key",
		);

		window.google = {
			maps: {
				importLibrary: vi.fn().mockResolvedValue({}),
				places: {
					Autocomplete: vi.fn().mockImplementation(() => ({
						addListener: vi.fn(() => ({ remove: vi.fn() })),
						getPlace: vi.fn(() => ({
							place_id: "pid",
							name: "Name",
							formatted_address: "Addr",
							geometry: { location: { lat: () => 1, lng: () => 2 } },
						})),
					})),
				},
			},
		};

		const loaded = await loadGoogleMapsPlaces("abc");
		expect(loaded).toBe(window.google);

		const container = document.createElement("div");
		document.body.appendChild(container);
		const onInputChange = vi.fn();
		const cleanup = mountPlaceAutocompleteElement({
			container,
			placeholder: "Search",
			onPlaceSelected: vi.fn(),
			onInputChange,
		});
		expect(container.querySelector("input")).toBeTruthy();
		const input = container.querySelector("input");
		input.value = "blr";
		input.dispatchEvent(new Event("input"));
		expect(onInputChange).toHaveBeenCalledWith("blr");
		cleanup();
		expect(container.childElementCount).toBe(0);
	});

	it("covers firebase auth utility functions", async () => {
		const initializeApp = vi.fn(() => ({ app: true }));
		const getAuth = vi.fn(() => ({ auth: true }));
		const signInWithPopup = vi.fn().mockResolvedValue({ user: { uid: "1" } });
		const signInWithRedirect = vi.fn().mockResolvedValue(undefined);
		const getRedirectResult = vi.fn().mockResolvedValue({ user: { uid: "2" } });
		const signInWithPhoneNumber = vi
			.fn()
			.mockResolvedValue({ confirmationResult: true });
		const setCustomParameters = vi.fn();

		vi.doMock("firebase/app", () => ({ initializeApp }));
		vi.doMock("firebase/auth", () => ({
			GoogleAuthProvider: vi
				.fn()
				.mockImplementation(() => ({ setCustomParameters })),
			RecaptchaVerifier: vi.fn().mockImplementation(() => ({
				render: vi.fn().mockResolvedValue(1),
				clear: vi.fn(),
			})),
			getAuth,
			getRedirectResult,
			signInWithPhoneNumber,
			signInWithPopup,
			signInWithRedirect,
		}));

		vi.stubEnv("VITE_FIREBASE_API_KEY", "k");
		vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "x.firebaseapp.com");
		vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "pid");
		vi.stubEnv("VITE_FIREBASE_APP_ID", "app");

		const firebaseAuth = await importFresh("../utils/firebaseAuth.js");
		expect(firebaseAuth.isFirebaseConfigured()).toBe(true);
		expect(firebaseAuth.getFirebaseAuthClient()).toEqual({ auth: true });
		expect(await firebaseAuth.signInWithGoogleFirebase()).toEqual({
			user: { uid: "1" },
		});
		expect(setCustomParameters).toHaveBeenCalled();
		await firebaseAuth.signInWithGoogleFirebase({ useRedirect: true });
		expect(signInWithRedirect).toHaveBeenCalled();
		expect(await firebaseAuth.getGoogleRedirectResultFirebase()).toEqual({
			user: { uid: "2" },
		});
		expect(
			await firebaseAuth.sendPhoneOtpFirebase({
				phoneNumber: "+919999999999",
				recaptchaContainerId: "recaptcha-container",
			}),
		).toEqual({ confirmationResult: true });
		expect(firebaseAuth.normalizePhoneToE164("99999 99999")).toBe(
			"+919999999999",
		);
		expect(firebaseAuth.normalizePhoneToE164("+14155551234")).toBe(
			"+14155551234",
		);
	});

	it("covers analytics init and page view tracking", async () => {
		vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
		const gtag = vi.fn();
		window.gtag = gtag;
		window.dataLayer = [];

		const { initGoogleAnalytics, trackPageView } = await importFresh(
			"../utils/analytics.js",
		);
		expect(initGoogleAnalytics()).toBe(true);
		trackPageView("/home");
		expect(gtag).toHaveBeenCalledWith(
			"event",
			"page_view",
			expect.objectContaining({ page_path: "/home" }),
		);
	});

	it("covers axios client interceptors", async () => {
		vi.doUnmock("../api/axios");
		const { default: api } = await importFresh("../api/axios");
		localStorage.setItem("token", "abc");

		const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
		const config = requestInterceptor({ headers: {} });
		expect(config.headers.Authorization).toBe("Bearer abc");

		const responseRejector = api.interceptors.response.handlers[0].rejected;
		localStorage.setItem("user", "{}");
		await expect(
			responseRejector({ response: { status: 500 } }),
		).rejects.toMatchObject({ response: { status: 500 } });
	});

	it("covers image compressor success and input validation", async () => {
		const fakeBlob = new Blob(["x"], { type: "image/webp" });
		const mockCanvas = {
			width: 0,
			height: 0,
			toDataURL: vi.fn(() => "data:image/webp;base64,AA"),
			getContext: vi.fn(() => ({ drawImage: vi.fn() })),
			toBlob: vi.fn((callback) => callback(fakeBlob)),
		};

		const createElementSpy = vi.spyOn(document, "createElement");
		createElementSpy.mockImplementation((tag) => {
			if (tag === "canvas") return mockCanvas;
			return originalCreateElement(tag);
		});

		global.URL.createObjectURL = vi.fn(() => "blob://image");
		global.URL.revokeObjectURL = vi.fn();

		class MockImage {
			constructor() {
				this.width = 2000;
				this.height = 1000;
			}
			set src(_value) {
				setTimeout(() => this.onload?.(), 0);
			}
		}
		global.Image = MockImage;

		const { compressImageFile } = await importFresh(
			"../utils/imageCompressor.js",
		);
		await expect(
			compressImageFile(new File(["x"], "x.txt", { type: "text/plain" })),
		).rejects.toThrow("Only image files can be compressed");

		const result = await compressImageFile(
			new File(["123"], "photo.png", { type: "image/png" }),
		);
		expect(result).toBeInstanceOf(File);
		expect(result.name.endsWith(".webp")).toBe(true);
		expect(result.type).toBe("image/webp");
	});
});
