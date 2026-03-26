import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getBusinesses = asyncHandler(async (req, res) => {
	const page = Math.max(Number(req.query.page) || 1, 1);
	const limit = Math.min(Number(req.query.limit) || 20, 50);
	const offset = (page - 1) * limit;

	const businesses = await models.User.findAndCountAll({
		where: {
			accountType: "business",
			isActive: true,
		},
		attributes: [
			"id",
			"name",
			"avatar",
			"location",
			"accountType",
			"businessName",
			"createdAt",
		],
		include: [
			{
				model: models.Listing,
				as: "listings",
				attributes: ["id"],
				required: true,
			},
		],
		order: [["createdAt", "DESC"]],
		distinct: true,
		limit,
		offset,
	});

	const normalized = businesses.rows.map((user) => ({
		id: user.id,
		name: user.name,
		businessName: user.businessName || user.name,
		avatar: user.avatar,
		location: user.location || "Not specified",
		listingCount: user.listings?.length || 0,
	}));

	res.json({
		businesses: normalized,
		total: businesses.count,
		page,
		pages: Math.max(Math.ceil(businesses.count / limit), 1),
	});
});
