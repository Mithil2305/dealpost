import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToR2 } from "../utils/r2Upload.js";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function normalizeGstin(value) {
	return String(value || "")
		.trim()
		.toUpperCase();
}

function isValidGstin(value) {
	return GSTIN_REGEX.test(normalizeGstin(value));
}

// ---------------------------------------------------------------------------
// GET /api/users/:id  — public profile
// ---------------------------------------------------------------------------
export const getUserProfile = asyncHandler(async (req, res) => {
	const requesterId = Number(req.user?.id || 0);
	const targetId = Number(req.params.id);
	const isOwner = requesterId > 0 && requesterId === targetId;
	const isAdmin = ["admin", "developer"].includes(String(req.user?.role || ""));

	const attributes =
		isOwner || isAdmin
			? { exclude: ["password"] }
			: ["id", "name", "avatar", "accountType", "businessName", "createdAt"];

	const user = await models.User.findByPk(req.params.id, {
		attributes,
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

	const nextAccountType =
		accountType !== undefined
			? String(accountType).toLowerCase()
			: String(req.user.accountType || "personal").toLowerCase();

	if (name !== undefined) {
		if (String(name).trim().length < 2) {
			return res
				.status(400)
				.json({ message: "Name must be at least 2 characters" });
		}
		req.user.name = String(name).trim();
	}

	if (phone !== undefined) {
		const normalizedPhone = String(phone || "")
			.trim()
			.slice(0, 20);
		req.user.phone = normalizedPhone || null;
	}
	if (location !== undefined) req.user.location = location;

	if (accountType !== undefined) {
		if (!["personal", "business"].includes(nextAccountType)) {
			return res
				.status(400)
				.json({ message: "accountType must be personal or business" });
		}
		req.user.accountType = nextAccountType;
	}

	if (businessName !== undefined) {
		req.user.businessName = String(businessName).trim() || null;
	}

	if (gstOrMsme !== undefined) {
		const normalizedGstin = normalizeGstin(gstOrMsme);
		req.user.gstOrMsme = normalizedGstin || null;
	}

	if (nextAccountType === "business") {
		const nextBusinessName = String(req.user.businessName || "").trim();
		const nextLocation = String(req.user.location || "").trim();
		const nextGstin = normalizeGstin(req.user.gstOrMsme);

		if (!nextBusinessName) {
			return res.status(400).json({ message: "Business name is required" });
		}

		if (!nextLocation) {
			return res.status(400).json({ message: "Business location is required" });
		}

		if (!nextGstin) {
			return res
				.status(400)
				.json({ message: "GSTIN is required for business accounts" });
		}

		if (!isValidGstin(nextGstin)) {
			return res.status(400).json({
				message:
					"Invalid GSTIN format. Use a valid 15-character GSTIN (e.g., 22AAAAA0000A1Z5)",
			});
		}
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

	if (String(newPassword).length < 8) {
		return res
			.status(400)
			.json({ message: "New password must be at least 8 characters" });
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

// ---------------------------------------------------------------------------
// PATCH /api/users/me/deactivate  — deactivate own account
// ---------------------------------------------------------------------------
export const deactivateMyAccount = asyncHandler(async (req, res) => {
	if (["admin", "developer"].includes(String(req.user?.role || ""))) {
		return res.status(403).json({
			message: "Privileged accounts cannot be deactivated from user dashboard",
		});
	}

	req.user.isActive = false;
	await req.user.save();

	res.json({ message: "Account deactivated" });
});

// ---------------------------------------------------------------------------
// DELETE /api/users/me  — remove own account (soft-delete style)
// ---------------------------------------------------------------------------
export const deleteMyAccount = asyncHandler(async (req, res) => {
	if (["admin", "developer"].includes(String(req.user?.role || ""))) {
		return res.status(403).json({
			message: "Privileged accounts cannot be removed from user dashboard",
		});
	}

	const accountId = Number(req.user.id);
	const suffix = `${accountId}-${Date.now()}`;

	req.user.name = "Deleted User";
	req.user.email = `deleted+${suffix}@dealpost.local`;
	req.user.phone = null;
	req.user.avatar = "";
	req.user.location = null;
	req.user.businessName = null;
	req.user.gstOrMsme = null;
	req.user.accountType = "personal";
	req.user.likedListingIds = [];
	req.user.isActive = false;

	await req.user.save();

	res.json({ message: "Account removed" });
});
