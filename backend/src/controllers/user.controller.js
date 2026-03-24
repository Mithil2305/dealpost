import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToR2 } from "../utils/r2Upload.js";

// ---------------------------------------------------------------------------
// GET /api/users/:id  — public profile
// ---------------------------------------------------------------------------
export const getUserProfile = asyncHandler(async (req, res) => {
	const user = await models.User.findByPk(req.params.id, {
		attributes: { exclude: ["password"] },
	});

	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	res.json({ user });
});

// ---------------------------------------------------------------------------
// PUT /api/users/me  — update own profile (name, phone, location, avatar)
// Supports multipart/form-data with optional avatar file upload to R2
// ---------------------------------------------------------------------------
export const updateProfile = asyncHandler(async (req, res) => {
	const { name, phone, location, accountType, businessName, gstOrMsme } =
		req.body;

	if (name !== undefined) {
		if (String(name).trim().length < 2) {
			return res
				.status(400)
				.json({ message: "Name must be at least 2 characters" });
		}
		req.user.name = String(name).trim();
	}

	if (phone !== undefined) req.user.phone = phone;
	if (location !== undefined) req.user.location = location;

	if (accountType !== undefined) {
		const normalizedType = String(accountType).toLowerCase();
		if (!["personal", "business"].includes(normalizedType)) {
			return res
				.status(400)
				.json({ message: "accountType must be personal or business" });
		}
		req.user.accountType = normalizedType;
	}

	if (businessName !== undefined) {
		req.user.businessName = String(businessName).trim() || null;
	}

	if (gstOrMsme !== undefined) {
		req.user.gstOrMsme = String(gstOrMsme).trim().toUpperCase() || null;
	}

	// Upload new avatar to Cloudflare R2
	if (req.file) {
		const uploaded = await uploadToR2(req.file, "dealpost/avatars");
		req.user.avatar = uploaded.url;
	}

	await req.user.save();

	res.json({ user: req.user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// PUT /api/users/me/password  — change password (requires current password)
// ---------------------------------------------------------------------------
export const changePassword = asyncHandler(async (req, res) => {
	const { currentPassword, newPassword } = req.body;

	if (!currentPassword || !newPassword) {
		return res
			.status(400)
			.json({ message: "currentPassword and newPassword are required" });
	}

	if (String(newPassword).length < 6) {
		return res
			.status(400)
			.json({ message: "New password must be at least 6 characters" });
	}

	const isValid = await req.user.comparePassword(currentPassword);
	if (!isValid) {
		return res.status(400).json({ message: "Current password is incorrect" });
	}

	if (currentPassword === newPassword) {
		return res
			.status(400)
			.json({ message: "New password must differ from current password" });
	}

	req.user.password = newPassword;
	await req.user.save();

	res.json({ message: "Password updated successfully" });
});
