import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

const namedHandler = (name) => (req, res) => {
	res.status(200).json({
		handler: name,
		method: req.method,
		path: req.path,
	});
};

const passthroughMiddleware = (_req, _res, next) => next();

vi.mock("../src/middleware/auth.middleware.js", () => ({
	optionalAuth: passthroughMiddleware,
	protect: passthroughMiddleware,
}));

vi.mock("../src/middleware/role.middleware.js", () => ({
	requireAdmin: passthroughMiddleware,
}));

vi.mock("../src/middleware/upload.middleware.js", () => ({
	upload: {
		single: () => passthroughMiddleware,
		array: () => passthroughMiddleware,
		fields: () => passthroughMiddleware,
	},
}));

vi.mock("../src/controllers/auth.controller.js", () => ({
	firebaseAuth: namedHandler("firebaseAuth"),
	getMe: namedHandler("getMe"),
	googleAuth: namedHandler("googleAuth"),
	login: namedHandler("login"),
	register: namedHandler("register"),
}));

vi.mock("../src/controllers/admin.controller.js", () => ({
	adminDeleteListing: namedHandler("adminDeleteListing"),
	banUser: namedHandler("banUser"),
	createAdminCategory: namedHandler("createAdminCategory"),
	createReport: namedHandler("createReport"),
	deleteAdminCategory: namedHandler("deleteAdminCategory"),
	getAllCategories: namedHandler("getAllCategories"),
	getAllListings: namedHandler("getAllListings"),
	getAllUsers: namedHandler("getAllUsers"),
	getDashboardStats: namedHandler("getDashboardStats"),
	getReports: namedHandler("getReports"),
	toggleUserStatus: namedHandler("toggleUserStatus"),
	updateAdminCategory: namedHandler("updateAdminCategory"),
	updateReportStatus: namedHandler("updateReportStatus"),
	updateListingStatus: namedHandler("updateListingStatus"),
}));

vi.mock("../src/controllers/business.controller.js", () => ({
	createBusiness: namedHandler("createBusiness"),
	deleteBusiness: namedHandler("deleteBusiness"),
	getBusinesses: namedHandler("getBusinesses"),
	getMyBusinesses: namedHandler("getMyBusinesses"),
	updateBusiness: namedHandler("updateBusiness"),
}));

vi.mock("../src/controllers/category.controller.js", () => ({
	createCategory: namedHandler("createCategory"),
	getCategories: namedHandler("getCategories"),
}));

vi.mock("../src/controllers/config.controller.js", () => ({
	getPublicConfig: namedHandler("getPublicConfig"),
}));

vi.mock("../src/controllers/conversation.controller.js", () => ({
	getMessages: namedHandler("getMessages"),
	getMyConversations: namedHandler("getMyConversations"),
	sendMessage: namedHandler("sendMessage"),
	startConversation: namedHandler("startConversation"),
}));

vi.mock("../src/controllers/listing.controller.js", () => ({
	createListing: namedHandler("createListing"),
	deleteListing: namedHandler("deleteListing"),
	directListingImageUpload: namedHandler("directListingImageUpload"),
	getListingById: namedHandler("getListingById"),
	getMyLikedListings: namedHandler("getMyLikedListings"),
	getListings: namedHandler("getListings"),
	getMyListings: namedHandler("getMyListings"),
	likeListing: namedHandler("likeListing"),
	placeAuctionBid: namedHandler("placeAuctionBid"),
	patchListing: namedHandler("patchListing"),
	presignListingImageUpload: namedHandler("presignListingImageUpload"),
	unlikeListing: namedHandler("unlikeListing"),
	updateListing: namedHandler("updateListing"),
}));

vi.mock("../src/controllers/message.controller.js", () => ({
	quickMessage: namedHandler("quickMessage"),
}));

vi.mock("../src/controllers/sponsoredAd.controller.js", () => ({
	createAdminSponsoredAd: namedHandler("createAdminSponsoredAd"),
	createSponsoredAd: namedHandler("createSponsoredAd"),
	deleteAdminSponsoredAd: namedHandler("deleteAdminSponsoredAd"),
	deleteMySponsoredAd: namedHandler("deleteMySponsoredAd"),
	getAdminGoogleAdsSnippet: namedHandler("getAdminGoogleAdsSnippet"),
	getAdminSponsoredAds: namedHandler("getAdminSponsoredAds"),
	getMySponsoredAds: namedHandler("getMySponsoredAds"),
	getPublicSponsoredAds: namedHandler("getPublicSponsoredAds"),
	updateAdminSponsoredAd: namedHandler("updateAdminSponsoredAd"),
	updateMySponsoredAd: namedHandler("updateMySponsoredAd"),
	upsertAdminGoogleAdsSnippet: namedHandler("upsertAdminGoogleAdsSnippet"),
}));

vi.mock("../src/controllers/user.controller.js", () => ({
	changePassword: namedHandler("changePassword"),
	deactivateMyAccount: namedHandler("deactivateMyAccount"),
	deleteMyAccount: namedHandler("deleteMyAccount"),
	getUserProfile: namedHandler("getUserProfile"),
	updateProfile: namedHandler("updateProfile"),
}));

let app;

beforeAll(async () => {
	process.env.NODE_ENV = "test";
	process.env.CLIENT_URL = "http://localhost:5173";
	process.env.DB_HOST = "127.0.0.1";
	process.env.DB_PORT = "3306";
	process.env.DB_NAME = "dealpost_test";
	process.env.DB_USER = "test_user";
	process.env.DB_PASSWORD = "test_pass";
	process.env.JWT_SECRET = "test_jwt_secret";

	const loaded = await import("../src/app.js");
	app = loaded.default;
});

const endpointMatrix = [
	// auth
	{ method: "post", path: "/api/auth/register", handler: "register" },
	{ method: "post", path: "/api/auth/login", handler: "login" },
	{ method: "post", path: "/api/auth/google", handler: "googleAuth" },
	{ method: "post", path: "/api/auth/firebase", handler: "firebaseAuth" },
	{ method: "get", path: "/api/auth/me", handler: "getMe" },

	// listings
	{ method: "get", path: "/api/listings", handler: "getListings" },
	{ method: "get", path: "/api/listings/my", handler: "getMyListings" },
	{
		method: "get",
		path: "/api/listings/liked/my",
		handler: "getMyLikedListings",
	},
	{
		method: "post",
		path: "/api/listings/uploads/presign",
		handler: "presignListingImageUpload",
	},
	{
		method: "post",
		path: "/api/listings/uploads/direct",
		handler: "directListingImageUpload",
	},
	{ method: "post", path: "/api/listings/123/like", handler: "likeListing" },
	{
		method: "delete",
		path: "/api/listings/123/like",
		handler: "unlikeListing",
	},
	{
		method: "post",
		path: "/api/listings/123/bids",
		handler: "placeAuctionBid",
	},
	{ method: "get", path: "/api/listings/123", handler: "getListingById" },
	{ method: "post", path: "/api/listings", handler: "createListing" },
	{ method: "put", path: "/api/listings/123", handler: "updateListing" },
	{ method: "patch", path: "/api/listings/123", handler: "patchListing" },
	{ method: "delete", path: "/api/listings/123", handler: "deleteListing" },

	// categories
	{ method: "get", path: "/api/categories", handler: "getCategories" },
	{ method: "post", path: "/api/categories", handler: "createCategory" },

	// config
	{ method: "get", path: "/api/config/public", handler: "getPublicConfig" },

	// users
	{ method: "get", path: "/api/users/123", handler: "getUserProfile" },
	{ method: "put", path: "/api/users/me", handler: "updateProfile" },
	{
		method: "put",
		path: "/api/users/me/password",
		handler: "changePassword",
	},
	{
		method: "patch",
		path: "/api/users/me/deactivate",
		handler: "deactivateMyAccount",
	},
	{ method: "delete", path: "/api/users/me", handler: "deleteMyAccount" },

	// conversations/messages
	{
		method: "get",
		path: "/api/conversations",
		handler: "getMyConversations",
	},
	{
		method: "post",
		path: "/api/conversations",
		handler: "startConversation",
	},
	{
		method: "get",
		path: "/api/conversations/123/messages",
		handler: "getMessages",
	},
	{
		method: "post",
		path: "/api/conversations/123/messages",
		handler: "sendMessage",
	},
	{ method: "post", path: "/api/messages", handler: "quickMessage" },

	// admin
	{ method: "post", path: "/api/admin/reports", handler: "createReport" },
	{ method: "get", path: "/api/admin/stats", handler: "getDashboardStats" },
	{ method: "get", path: "/api/admin/reports", handler: "getReports" },
	{
		method: "patch",
		path: "/api/admin/reports/123/status",
		handler: "updateReportStatus",
	},
	{ method: "get", path: "/api/admin/users", handler: "getAllUsers" },
	{
		method: "patch",
		path: "/api/admin/users/123/status",
		handler: "toggleUserStatus",
	},
	{ method: "post", path: "/api/admin/users/123/ban", handler: "banUser" },
	{ method: "get", path: "/api/admin/categories", handler: "getAllCategories" },
	{
		method: "post",
		path: "/api/admin/categories",
		handler: "createAdminCategory",
	},
	{
		method: "patch",
		path: "/api/admin/categories/123",
		handler: "updateAdminCategory",
	},
	{
		method: "delete",
		path: "/api/admin/categories/123",
		handler: "deleteAdminCategory",
	},
	{ method: "get", path: "/api/admin/listings", handler: "getAllListings" },
	{
		method: "patch",
		path: "/api/admin/listings/123/status",
		handler: "updateListingStatus",
	},
	{
		method: "delete",
		path: "/api/admin/listings/123",
		handler: "adminDeleteListing",
	},
	{
		method: "get",
		path: "/api/admin/sponsored-ads",
		handler: "getAdminSponsoredAds",
	},
	{
		method: "post",
		path: "/api/admin/sponsored-ads",
		handler: "createAdminSponsoredAd",
	},
	{
		method: "patch",
		path: "/api/admin/sponsored-ads/123",
		handler: "updateAdminSponsoredAd",
	},
	{
		method: "delete",
		path: "/api/admin/sponsored-ads/123",
		handler: "deleteAdminSponsoredAd",
	},
	{
		method: "get",
		path: "/api/admin/sponsored-ads/google-snippet",
		handler: "getAdminGoogleAdsSnippet",
	},
	{
		method: "put",
		path: "/api/admin/sponsored-ads/google-snippet",
		handler: "upsertAdminGoogleAdsSnippet",
	},

	// businesses
	{ method: "get", path: "/api/businesses", handler: "getBusinesses" },
	{ method: "get", path: "/api/businesses/mine", handler: "getMyBusinesses" },
	{ method: "post", path: "/api/businesses", handler: "createBusiness" },
	{ method: "put", path: "/api/businesses/123", handler: "updateBusiness" },
	{
		method: "delete",
		path: "/api/businesses/123",
		handler: "deleteBusiness",
	},

	// sponsored ads
	{
		method: "get",
		path: "/api/sponsored-ads/public",
		handler: "getPublicSponsoredAds",
	},
	{
		method: "get",
		path: "/api/sponsored-ads/my",
		handler: "getMySponsoredAds",
	},
	{
		method: "post",
		path: "/api/sponsored-ads",
		handler: "createSponsoredAd",
	},
	{
		method: "patch",
		path: "/api/sponsored-ads/123",
		handler: "updateMySponsoredAd",
	},
	{
		method: "delete",
		path: "/api/sponsored-ads/123",
		handler: "deleteMySponsoredAd",
	},
];

describe("Backend Route Coverage Audit", () => {
	it("wires all backend route handlers and returns controller responses", async () => {
		for (const endpoint of endpointMatrix) {
			const req = request(app)[endpoint.method](endpoint.path);
			if (["post", "put", "patch"].includes(endpoint.method)) {
				req.send({ audit: true });
			}

			const res = await req;
			expect(
				res.status,
				`${endpoint.method.toUpperCase()} ${endpoint.path}`,
			).toBe(200);
			expect(res.body).toMatchObject({ handler: endpoint.handler });
		}
	});
});

describe("Backend Security and Core Middleware Audit", () => {
	it("returns health status and request correlation header", async () => {
		const res = await request(app).get("/api/health");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
		expect(res.headers["x-request-id"]).toBeTruthy();
	});

	it("allows configured CORS origin", async () => {
		const res = await request(app)
			.get("/api/health")
			.set("Origin", "http://localhost:5173");

		expect(res.status).toBe(200);
		expect(res.headers["access-control-allow-origin"]).toBe(
			"http://localhost:5173",
		);
	});

	it("blocks disallowed CORS origin", async () => {
		const res = await request(app)
			.get("/api/health")
			.set("Origin", "https://evil.example");

		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("message");
		expect(res.headers["access-control-allow-origin"]).toBeUndefined();
	});

	it("returns 404 JSON for unknown API routes", async () => {
		const res = await request(app).get("/api/non-existent-route");

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: "Route not found" });
	});

	it("enforces auth rate limit to reduce brute-force attempts", async () => {
		let finalResponse;
		for (let i = 0; i < 11; i += 1) {
			finalResponse = await request(app).post("/api/auth/login").send({
				email: "audit@example.com",
				password: "wrong-password",
			});
		}

		expect(finalResponse.status).toBe(429);
		expect(finalResponse.body).toHaveProperty(
			"message",
			"Too many attempts. Try again later.",
		);
	});
});
