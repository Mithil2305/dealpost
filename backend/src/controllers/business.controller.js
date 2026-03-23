import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getBusinesses = asyncHandler(async (req, res) => {
	const businesses = await models.User.findAll({
		attributes: ["id", "name", "email", "avatar", "location", "createdAt"],
		include: [
			{
				model: models.Listing,
				as: "listings",
				attributes: ["id"],
				required: true,
			},
		],
		order: [["createdAt", "DESC"]],
	});

	const normalized = businesses.map((user) => ({
		id: user.id,
		name: user.name,
		businessName: user.name,
		email: user.email,
		avatar: user.avatar,
		location: user.location || "Not specified",
		listingCount: user.listings?.length || 0,
	}));

	res.json({ businesses: normalized });
});
