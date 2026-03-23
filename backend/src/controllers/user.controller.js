import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToR2 } from "../utils/r2Upload.js";

export const getUserProfile = asyncHandler(async (req, res) => {
	const user = await models.User.findByPk(req.params.id, {
		attributes: { exclude: ["password"] },
	});

	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	res.json({ user });
});

export const updateProfile = asyncHandler(async (req, res) => {
	const { name, phone, location } = req.body;

	if (name !== undefined) req.user.name = name;
	if (phone !== undefined) req.user.phone = phone;
	if (location !== undefined) req.user.location = location;

	if (req.file) {
		const uploaded = await uploadToR2(req.file, "dealpost/avatars");
		req.user.avatar = uploaded.url;
	}

	await req.user.save();

	res.json({ user: req.user.toSafeObject() });
});

export const changePassword = asyncHandler(async (req, res) => {
	const { currentPassword, newPassword } = req.body;

	if (!currentPassword || !newPassword) {
		return res
			.status(400)
			.json({ message: "currentPassword and newPassword are required" });
	}

	const isValid = await req.user.comparePassword(currentPassword);
	if (!isValid) {
		return res.status(400).json({ message: "Current password is incorrect" });
	}

	req.user.password = newPassword;
	await req.user.save();

	res.json({ message: "Password updated" });
});
