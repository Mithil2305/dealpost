import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export const register = asyncHandler(async (req, res) => {
	const { name, email, password, phone, location } = req.body;

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
		location: location || null,
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
		return res
			.status(400)
			.json({ message: "Email and password are required" });
	}

	const user = await models.User.findOne({
		where: { email: String(email).toLowerCase() },
	});

	if (!user || !(await user.comparePassword(password))) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	if (!user.isActive) {
		return res
			.status(403)
			.json({ message: "Your account has been suspended" });
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
