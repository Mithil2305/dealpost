import { env } from "../config/env.js";
import {
	getFirebaseAuthClient,
	isFirebaseAdminConfigured,
} from "../config/firebaseAdmin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { reverseGeocodeLocation } from "../services/locationGeocoding.js";

export const getPublicConfig = asyncHandler(async (req, res) => {
	res.setHeader(
		"Cache-Control",
		req.user ? "private, max-age=300" : "public, max-age=300",
	);

	res.json({
		googleMapsBrowserApiKey: req.user
			? env.GOOGLE_MAPS_BROWSER_API_KEY || ""
			: "",
	});
});

export const reverseGeocode = asyncHandler(async (req, res) => {
	const lat = req.body?.lat ?? req.query?.lat;
	const lng = req.body?.lng ?? req.query?.lng;
	const placeId = req.body?.placeId ?? req.query?.placeId ?? "";

	const location = await reverseGeocodeLocation({ lat, lng, placeId });

	res.setHeader("Cache-Control", "private, max-age=300");
	res.json({ location });
});

// Diagnostic endpoint to verify Firebase setup (dev only)
export const getFirebaseDiagnostics = asyncHandler(async (req, res) => {
	if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") {
		return res.status(403).json({
			message: "Diagnostics endpoint only available in development",
		});
	}

	try {
		const configured = isFirebaseAdminConfigured();
		const client = configured ? getFirebaseAuthClient() : null;

		res.json({
			firebaseConfigured: configured,
			projectId: env.FIREBASE_PROJECT_ID ? "SET" : "MISSING",
			clientEmail: env.FIREBASE_CLIENT_EMAIL ? "SET" : "MISSING",
			privateKey: env.FIREBASE_PRIVATE_KEY
				? `SET (${env.FIREBASE_PRIVATE_KEY.length} chars)`
				: "MISSING",
			firebaseClientAvailable: Boolean(client),
			privateKeyValid: env.FIREBASE_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY")
				? "Appears valid"
				: "Check format",
			status: configured && client ? "READY" : "NOT_READY",
		});
	} catch (err) {
		console.error("Diagnostics error:", err);
		res.status(500).json({
			message: "Error checking Firebase configuration",
			error: err.message,
		});
	}
});
