import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

export const register = asyncHandler(async (req, res) => {
	const { name, email, password, phone, location } = req.body;

	if (!name || !email || !password) {
		return res
			.status(400)
			.json({ message: "Name, email, and password are required" });
	}

	const exists = await models.User.findOne({
		where: { email: String(email).toLowerCase() },
	});

	if (exists) {
		return res.status(400).json({ message: "Email already in use" });
	}

	const user = await models.User.create({
		name,
		email,
		password,
		phone,
		location,
	});

	const token = signToken(user.id);
	res.status(201).json({ token, user: user.toSafeObject() });
});

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
		return res.status(403).json({ message: "Account suspended" });
	}

	const token = signToken(user.id);
	res.json({ token, user: user.toSafeObject() });
});

export const getMe = asyncHandler(async (req, res) => {
	res.json({ user: req.user.toSafeObject() });
});
