import { models } from "../config/db.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidGstin, normalizeGstin } from "../utils/gstin.js";
import { uploadToR2 } from "../utils/r2Upload.js";

const structuredLocationFields = [
	"businessArea",
	"businessCity",
	"businessState",
	"businessPincode",
	"businessStreet",
	"businessDisplayAddress",
	"businessFormattedAddress",
];

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
			: [
					"id",
					"name",
					"avatar",
					"businessBanner",
					"accountType",
					"businessName",
					"createdAt",
				];

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
	const {
		name,
		phone,
		location,
		businessLatitude,
		businessLongitude,
		businessPlaceId,
		businessLocationUrl,
		businessArea,
		businessCity,
		businessState,
		businessPincode,
		businessStreet,
		businessDisplayAddress,
		businessFormattedAddress,
		accountType,
		businessName,
		gstOrMsme,
		removeAvatar,
		removeBusinessBanner,
	} = req.body;

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

	if (businessLatitude !== undefined) {
		const parsed = Number(businessLatitude);
		req.user.businessLatitude = Number.isFinite(parsed) ? parsed : null;
	}

	if (businessLongitude !== undefined) {
		const parsed = Number(businessLongitude);
		req.user.businessLongitude = Number.isFinite(parsed) ? parsed : null;
	}

	if (businessPlaceId !== undefined) {
		req.user.businessPlaceId = String(businessPlaceId).trim() || null;
	}

	for (const field of structuredLocationFields) {
		if (req.body[field] !== undefined) {
			req.user[field] = String(req.body[field] || "").trim() || null;
		}
	}

	if (businessLocationUrl !== undefined) {
		req.user.businessLocationUrl = String(businessLocationUrl).trim() || "";
	}

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
				.json({ message: "GST/MSME number is required for business accounts" });
		}

		if (
			!isValidGstin(nextGstin, {
				requireChecksum: env.GSTIN_VALIDATE_CHECKSUM,
			})
		) {
			return res.status(400).json({
				message: env.GSTIN_VALIDATE_CHECKSUM
					? "Invalid GST/MSME number. Use a valid GSTIN or MSME UDYAM number"
					: "Invalid GST/MSME number. Use GSTIN (e.g., 22AAAAA0000A1Z5) or UDYAM format (e.g., UDYAM-TN-12-1234567)",
			});
		}
	}

	if (nextAccountType !== "business") {
		req.user.businessName = null;
		req.user.gstOrMsme = null;
		req.user.businessBanner = "";
		req.user.businessLatitude = null;
		req.user.businessLongitude = null;
		req.user.businessArea = null;
		req.user.businessCity = null;
		req.user.businessState = null;
		req.user.businessPincode = null;
		req.user.businessStreet = null;
		req.user.businessDisplayAddress = null;
		req.user.businessFormattedAddress = null;
		req.user.businessPlaceId = null;
		req.user.businessLocationUrl = "";
	}

	const shouldRemoveAvatar =
		String(removeAvatar || "") === "1" ||
		String(removeAvatar || "").toLowerCase() === "true";

	if (shouldRemoveAvatar) {
		req.user.avatar = "";
	}

	const shouldRemoveBusinessBanner =
		String(removeBusinessBanner || "") === "1" ||
		String(removeBusinessBanner || "").toLowerCase() === "true";

	if (shouldRemoveBusinessBanner) {
		req.user.businessBanner = "";
	}

	const avatarFile = req.file || req.files?.avatar?.[0];
	const businessBannerFile = req.files?.businessBanner?.[0];

	// Upload new avatar to Cloudflare R2
	if (avatarFile) {
		const uploaded = await uploadToR2(avatarFile, "dealpost/avatars");
		req.user.avatar = uploaded.url;
	}

	if (businessBannerFile) {
		const uploaded = await uploadToR2(
			businessBannerFile,
			"dealpost/business-banners",
		);
		req.user.businessBanner = uploaded.url;
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
	req.user.businessBanner = "";
	req.user.businessLatitude = null;
	req.user.businessLongitude = null;
	req.user.businessArea = null;
	req.user.businessCity = null;
	req.user.businessState = null;
	req.user.businessPincode = null;
	req.user.businessStreet = null;
	req.user.businessDisplayAddress = null;
	req.user.businessFormattedAddress = null;
	req.user.businessPlaceId = null;
	req.user.businessLocationUrl = "";
	req.user.location = null;
	req.user.businessName = null;
	req.user.gstOrMsme = null;
	req.user.accountType = "personal";
	req.user.likedListingIds = [];
	req.user.isActive = false;

	await req.user.save();

	res.json({ message: "Account removed" });
});
