import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import {
	getFirebaseAuthClient,
	isFirebaseAdminConfigured,
} from "../config/firebaseAdmin.js";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidGstin, normalizeGstin } from "../utils/gstin.js";
import { signToken } from "../utils/jwt.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const E164_PHONE_REGEX = /^\+[1-9]\d{9,14}$/;
const googleClient = env.GOOGLE_CLIENT_ID
	? new OAuth2Client(env.GOOGLE_CLIENT_ID)
	: null;

const normalizeAccountType = (value) =>
	String(value || "personal").toLowerCase() === "business"
		? "business"
		: "personal";

function buildBusinessProfilePayload(input = {}) {
	const business =
		input.business && typeof input.business === "object" ? input.business : {};

	return {
		accountType: normalizeAccountType(input.accountType),
		businessName: String(input.businessName || business.name || "")
			.trim()
			.slice(0, 120),
		gstOrMsme: normalizeGstin(
			input.gstOrMsme || business.gstOrMsme || "",
		).slice(0, 64),
		location: String(input.location || business.location || "")
			.trim()
			.slice(0, 160),
	};
}

function assertBusinessProfileOrRespond(res, businessProfile) {
	if (businessProfile.accountType !== "business") return false;

	if (!businessProfile.businessName) {
		res.status(400).json({ message: "Business name is required" });
		return true;
	}
	if (!businessProfile.gstOrMsme) {
		res.status(400).json({ message: "GST/MSME number is required" });
		return true;
	}
	if (
		!isValidGstin(businessProfile.gstOrMsme, {
			requireChecksum: env.GSTIN_VALIDATE_CHECKSUM,
		})
	) {
		res.status(400).json({
			message: env.GSTIN_VALIDATE_CHECKSUM
				? "Invalid GST/MSME number. Use a valid GSTIN or MSME UDYAM number"
				: "Invalid GST/MSME number. Use GSTIN (e.g., 22AAAAA0000A1Z5) or UDYAM format (e.g., UDYAM-TN-12-1234567)",
		});
		return true;
	}
	if (!businessProfile.location) {
		res.status(400).json({ message: "Business location is required" });
		return true;
	}

	return false;
}

function normalizePhone(value) {
	return String(value || "")
		.trim()
		.replace(/[\s()-]/g, "");
}

async function upsertUserFromFederatedIdentity({
	email,
	phone,
	name,
	avatar,
	businessProfile,
	provider,
	uid,
}) {
	const normalizedEmail = String(email || "")
		.toLowerCase()
		.trim();
	const normalizedPhone = String(phone || "")
		.trim()
		.slice(0, 20);
	const safeName = String(name || "")
		.trim()
		.slice(0, 120);
	const safeAvatar = String(avatar || "")
		.trim()
		.slice(0, 512);

	let user = null;

	if (normalizedEmail) {
		user = await models.User.findOne({ where: { email: normalizedEmail } });
	}

	if (!user && normalizedPhone) {
		user = await models.User.findOne({ where: { phone: normalizedPhone } });
	}

	if (!user) {
		const syntheticEmail =
			normalizedEmail || `${provider}-${uid}@firebase.local`;
		const fallbackName =
			safeName ||
			normalizedPhone ||
			(normalizedEmail ? normalizedEmail.split("@")[0] : "DealPost User");

		const generatedPassword = `${provider}-oauth-${crypto
			.randomBytes(24)
			.toString("hex")}`;

		user = await models.User.create({
			name: fallbackName,
			email: syntheticEmail,
			password: generatedPassword,
			avatar: safeAvatar || "",
			phone: normalizedPhone || null,
			location: businessProfile.location || null,
			accountType: businessProfile.accountType,
			businessName:
				businessProfile.accountType === "business"
					? businessProfile.businessName
					: null,
			gstOrMsme:
				businessProfile.accountType === "business"
					? businessProfile.gstOrMsme
					: null,
		});
		return user;
	}

	const updates = {};
	if (!user.phone && normalizedPhone) updates.phone = normalizedPhone;
	if ((!user.avatar || !String(user.avatar).trim()) && safeAvatar) {
		updates.avatar = safeAvatar;
	}
	if ((!user.name || String(user.name).trim().length < 2) && safeName) {
		updates.name = safeName;
	}

	if (businessProfile.accountType === "business") {
		if (user.accountType !== "business") updates.accountType = "business";
		if (!String(user.businessName || "").trim()) {
			updates.businessName = businessProfile.businessName;
		}
		if (!String(user.gstOrMsme || "").trim()) {
			updates.gstOrMsme = businessProfile.gstOrMsme;
		}
		if (!String(user.location || "").trim() && businessProfile.location) {
			updates.location = businessProfile.location;
		}
	}

	if (Object.keys(updates).length) {
		await user.update(updates);
	}

	return user;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export const register = asyncHandler(async (req, res) => {
	const {
		name,
		email,
		password,
		phone,
		location,
		accountType,
		business,
		businessName,
		gstOrMsme,
	} = req.body;

	const normalizedAccountType =
		String(accountType || "personal").toLowerCase() === "business"
			? "business"
			: "personal";

	const businessPayload =
		business && typeof business === "object" ? business : {};
	const normalizedBusinessName = String(
		businessName || businessPayload.name || "",
	)
		.trim()
		.slice(0, 120);
	const normalizedGstOrMsme = normalizeGstin(
		gstOrMsme || businessPayload.gstOrMsme || "",
	).slice(0, 64);
	const normalizedLocation = String(location || businessPayload.location || "")
		.trim()
		.slice(0, 160);
	const normalizedPhone = normalizePhone(phone).slice(0, 20);

	if (!name || String(name).trim().length < 2) {
		return res
			.status(400)
			.json({ message: "Name must be at least 2 characters" });
	}

	if (!email || !EMAIL_REGEX.test(String(email))) {
		return res.status(400).json({ message: "A valid email is required" });
	}

	if (!password || String(password).length < 8) {
		return res
			.status(400)
			.json({ message: "Password must be at least 8 characters" });
	}

	if (!normalizedPhone || !E164_PHONE_REGEX.test(normalizedPhone)) {
		return res.status(400).json({
			message: "A valid phone number in E.164 format is required",
		});
	}

	if (normalizedAccountType === "business") {
		if (!normalizedBusinessName) {
			return res.status(400).json({ message: "Business name is required" });
		}
		if (!normalizedGstOrMsme) {
			return res.status(400).json({ message: "GST/MSME number is required" });
		}
		if (
			!isValidGstin(normalizedGstOrMsme, {
				requireChecksum: env.GSTIN_VALIDATE_CHECKSUM,
			})
		) {
			return res.status(400).json({
				message: env.GSTIN_VALIDATE_CHECKSUM
					? "Invalid GST/MSME number. Use a valid GSTIN or MSME UDYAM number"
					: "Invalid GST/MSME number. Use GSTIN (e.g., 22AAAAA0000A1Z5) or UDYAM format (e.g., UDYAM-TN-12-1234567)",
			});
		}
		if (!normalizedLocation) {
			return res.status(400).json({ message: "Business location is required" });
		}
	}

	const exists = await models.User.findOne({
		where: { email: String(email).toLowerCase() },
	});

	if (exists) {
		return res.status(400).json({ message: "Email already in use" });
	}

	const user = await models.User.create({
		name: String(name).trim(),
		email: String(email).toLowerCase(),
		password,
		phone: normalizedPhone,
		location: normalizedLocation || null,
		accountType: normalizedAccountType,
		businessName:
			normalizedAccountType === "business" ? normalizedBusinessName : null,
		gstOrMsme:
			normalizedAccountType === "business" ? normalizedGstOrMsme : null,
	});

	const token = signToken(user.id);
	res.status(201).json({ token, user: user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Email and password are required" });
	}

	const user = await models.User.findOne({
		where: { email: String(email).toLowerCase() },
	});

	if (!user || !(await user.comparePassword(password))) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	if (!user.isActive) {
		return res.status(403).json({ message: "Your account has been suspended" });
	}

	const token = signToken(user.id);
	res.json({ token, user: user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// POST /api/auth/google
// ---------------------------------------------------------------------------
export const googleAuth = asyncHandler(async (req, res) => {
	const {
		credential,
		accountType,
		business,
		businessName,
		gstOrMsme,
		location,
	} = req.body || {};

	if (!env.GOOGLE_CLIENT_ID || !googleClient) {
		return res
			.status(500)
			.json({ message: "Google auth is not configured on server" });
	}

	if (!credential) {
		return res.status(400).json({ message: "Google credential is required" });
	}

	let payload;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: credential,
			audience: env.GOOGLE_CLIENT_ID,
		});
		payload = ticket.getPayload();
	} catch {
		return res.status(401).json({ message: "Invalid Google credential" });
	}

	if (!payload?.email || !payload.email_verified) {
		return res
			.status(401)
			.json({ message: "Google account email is not verified" });
	}

	const normalizedEmail = String(payload.email).toLowerCase();
	let user = await models.User.findOne({ where: { email: normalizedEmail } });

	const normalizedAccountType =
		String(accountType || "personal").toLowerCase() === "business"
			? "business"
			: "personal";
	const businessPayload =
		business && typeof business === "object" ? business : {};
	const normalizedBusinessName = String(
		businessName || businessPayload.name || "",
	)
		.trim()
		.slice(0, 120);
	const normalizedGstOrMsme = normalizeGstin(
		gstOrMsme || businessPayload.gstOrMsme || "",
	).slice(0, 64);
	const normalizedLocation = String(location || businessPayload.location || "")
		.trim()
		.slice(0, 160);

	if (!user) {
		if (normalizedAccountType === "business") {
			if (!normalizedBusinessName) {
				return res.status(400).json({ message: "Business name is required" });
			}
			if (!normalizedGstOrMsme) {
				return res.status(400).json({ message: "GST/MSME number is required" });
			}
			if (
				!isValidGstin(normalizedGstOrMsme, {
					requireChecksum: env.GSTIN_VALIDATE_CHECKSUM,
				})
			) {
				return res.status(400).json({
					message: env.GSTIN_VALIDATE_CHECKSUM
						? "Invalid GST/MSME number. Use a valid GSTIN or MSME UDYAM number"
						: "Invalid GST/MSME number. Use GSTIN (e.g., 22AAAAA0000A1Z5) or UDYAM format (e.g., UDYAM-TN-12-1234567)",
				});
			}
			if (!normalizedLocation) {
				return res
					.status(400)
					.json({ message: "Business location is required" });
			}
		}

		const fallbackName = normalizedEmail.split("@")[0] || "DealPost User";
		const incomingName = String(
			payload.name || payload.given_name || fallbackName,
		)
			.trim()
			.slice(0, 120);
		const generatedPassword = `google-oauth-${crypto
			.randomBytes(24)
			.toString("hex")}`;

		user = await models.User.create({
			name: incomingName.length >= 2 ? incomingName : fallbackName,
			email: normalizedEmail,
			password: generatedPassword,
			avatar: String(payload.picture || "").slice(0, 512),
			location: normalizedLocation || null,
			accountType: normalizedAccountType,
			businessName:
				normalizedAccountType === "business" ? normalizedBusinessName : null,
			gstOrMsme:
				normalizedAccountType === "business" ? normalizedGstOrMsme : null,
		});
	}

	if (!user.isActive) {
		return res.status(403).json({ message: "Your account has been suspended" });
	}

	const updates = {};
	if ((!user.avatar || !String(user.avatar).trim()) && payload.picture) {
		updates.avatar = String(payload.picture).slice(0, 512);
	}
	if (
		(!user.name || String(user.name).trim().length < 2) &&
		(payload.name || payload.given_name)
	) {
		updates.name = String(payload.name || payload.given_name)
			.trim()
			.slice(0, 120);
	}
	if (Object.keys(updates).length > 0) {
		await user.update(updates);
	}

	const token = signToken(user.id);
	res.json({ token, user: user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// POST /api/auth/firebase
// Accepts Firebase ID token from Google popup or phone OTP flows.
// ---------------------------------------------------------------------------
export const firebaseAuth = asyncHandler(async (req, res) => {
	const { idToken, flow, phone: requestedPhone, email, name } = req.body || {};
	if (!idToken) {
		return res.status(400).json({ message: "Firebase idToken is required" });
	}

	if (!isFirebaseAdminConfigured()) {
		return res.status(500).json({
			message: "Firebase auth is not configured on server",
		});
	}

	const firebaseAuthClient = getFirebaseAuthClient();
	if (!firebaseAuthClient) {
		return res.status(500).json({
			message: "Firebase auth is not configured on server",
		});
	}

	let decodedToken;
	try {
		decodedToken = await firebaseAuthClient.verifyIdToken(
			String(idToken),
			true,
		);
	} catch {
		return res.status(401).json({ message: "Invalid Firebase token" });
	}

	const provider =
		decodedToken.firebase?.sign_in_provider === "phone" ? "phone" : "google";
	const normalizedRequestedPhone = normalizePhone(requestedPhone).slice(0, 20);
	const finalPhone =
		normalizePhone(decodedToken.phone_number).slice(0, 20) ||
		normalizedRequestedPhone;
	const isSignupFlow = String(flow || "").toLowerCase() === "signup";

	if (isSignupFlow && (!finalPhone || !E164_PHONE_REGEX.test(finalPhone))) {
		return res.status(400).json({
			message:
				"Phone number is required for signup and must be in E.164 format",
		});
	}

	const businessProfile = buildBusinessProfilePayload(req.body || {});
	if (assertBusinessProfileOrRespond(res, businessProfile)) {
		return;
	}

	const user = await upsertUserFromFederatedIdentity({
		email: decodedToken.email || email,
		phone: finalPhone,
		name: decodedToken.name || name,
		avatar: decodedToken.picture,
		businessProfile,
		provider,
		uid: decodedToken.uid,
	});

	if (!user?.isActive) {
		return res.status(403).json({ message: "Your account has been suspended" });
	}

	const token = signToken(user.id);
	res.json({ token, user: user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  — returns current authenticated user
// ---------------------------------------------------------------------------
export const getMe = asyncHandler(async (req, res) => {
	res.json({ user: req.user.toSafeObject() });
});
