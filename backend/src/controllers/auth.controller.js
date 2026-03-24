import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

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

	if (!email || !String(email).includes("@")) {
		return res.status(400).json({ message: "A valid email is required" });
	}

	if (!password || String(password).length < 6) {
		return res
			.status(400)
			.json({ message: "Password must be at least 6 characters" });
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
// GET /api/auth/me  — returns current authenticated user
// ---------------------------------------------------------------------------
export const getMe = asyncHandler(async (req, res) => {
	res.json({ user: req.user.toSafeObject() });
});
