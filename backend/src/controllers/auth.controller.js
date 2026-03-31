import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const googleClient = env.GOOGLE_CLIENT_ID
	? new OAuth2Client(env.GOOGLE_CLIENT_ID)
	: null;

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
	const normalizedGstOrMsme = String(
		gstOrMsme || businessPayload.gstOrMsme || "",
	)
		.trim()
		.toUpperCase()
		.slice(0, 64);
	const normalizedLocation = String(location || businessPayload.location || "")
		.trim()
		.slice(0, 160);

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

	if (normalizedAccountType === "business") {
		if (!normalizedBusinessName) {
			return res.status(400).json({ message: "Business name is required" });
		}
		if (!normalizedGstOrMsme) {
			return res.status(400).json({ message: "GST/MSME number is required" });
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
		phone: phone || null,
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
	const normalizedGstOrMsme = String(
		gstOrMsme || businessPayload.gstOrMsme || "",
	)
		.trim()
		.toUpperCase()
		.slice(0, 64);
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
// GET /api/auth/me  — returns current authenticated user
// ---------------------------------------------------------------------------
export const getMe = asyncHandler(async (req, res) => {
	res.json({ user: req.user.toSafeObject() });
});
