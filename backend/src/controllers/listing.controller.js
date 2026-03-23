import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToR2 } from "../utils/r2Upload.js";

const sortMap = {
	Newest: [["createdAt", "DESC"]],
	"Price Low-High": [["price", "ASC"]],
	"Price High-Low": [["price", "DESC"]],
	"Most Popular": [["views", "DESC"]],
};

function toPlain(item) {
	if (!item) return item;
	return typeof item.toJSON === "function" ? item.toJSON() : item;
}

function normalizeListingPayload(item) {
	const listing = toPlain(item);
	if (!listing) return listing;

	const categoryObj =
		typeof listing.category === "object" && listing.category !== null
			? listing.category
			: null;
	const sellerObj =
		typeof listing.seller === "object" && listing.seller !== null
			? listing.seller
			: null;

	if (sellerObj?.id && !sellerObj._id) {
		sellerObj._id = sellerObj.id;
	}

	return {
		...listing,
		_id: listing.id,
		category: categoryObj?.name || listing.category || "General",
		...(categoryObj ? { categoryObj } : {}),
		...(sellerObj ? { seller: sellerObj } : {}),
		businessName: sellerObj?.name || listing.businessName || null,
	};
}

function parseMaybeJson(value, fallback) {
	if (!value) return fallback;
	if (typeof value === "object") return value;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

async function resolveCategoryId(categoryInput) {
	if (!categoryInput) return null;

	const numericId = Number(categoryInput);
	if (!Number.isNaN(numericId)) {
		const byId = await models.Category.findByPk(numericId);
		if (byId) return byId.id;
	}

	const byName = await models.Category.findOne({
		where: {
			name: {
				[Op.like]: String(categoryInput),
			},
		},
	});

	return byName?.id || null;
}

export const getListings = asyncHandler(async (req, res) => {
	const {
		q,
		search,
		category,
		minPrice,
		maxPrice,
		condition,
		sort = "Newest",
		userId,
		page = 1,
		limit = 20,
	} = req.query;

	const where = {};

	if (userId === "me") {
		if (!req.user) {
			return res.status(401).json({ message: "Authentication required" });
		}
		where.sellerId = req.user.id;
	} else {
		where.status = "active";
	}

	const searchTerm = q || search;
	if (searchTerm) {
		where[Op.or] = [
			{ title: { [Op.like]: `%${searchTerm}%` } },
			{ description: { [Op.like]: `%${searchTerm}%` } },
		];
	}

	if (category) {
		const categoryNames = String(category)
			.split(",")
			.map((v) => v.trim())
			.filter(Boolean);

		if (categoryNames.length) {
			const foundCategories = await models.Category.findAll({
				where: {
					name: {
						[Op.in]: categoryNames,
					},
				},
			});
			const ids = foundCategories.map((item) => item.id);
			if (ids.length) {
				where.categoryId = { [Op.in]: ids };
			}
		}
	}

	if (condition) {
		where.condition = condition;
	}

	if (minPrice || maxPrice) {
		where.price = {};
		if (minPrice) where.price[Op.gte] = Number(minPrice);
		if (maxPrice) where.price[Op.lte] = Number(maxPrice);
	}

	const numericPage = Number(page) || 1;
	const numericLimit = Number(limit) || 20;
	const offset = (numericPage - 1) * numericLimit;

	const { rows, count } = await models.Listing.findAndCountAll({
		where,
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "avatar", "phone", "email", "location"],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
		order: sortMap[sort] || sortMap.Newest,
		offset,
		limit: numericLimit,
	});

	const normalized = rows.map((row) => normalizeListingPayload(row));

	res.json({
		listings: normalized,
		total: count,
		page: numericPage,
		pages: Math.ceil(count / numericLimit),
	});
});

export const getMyListings = asyncHandler(async (req, res) => {
	const listings = await models.Listing.findAll({
		where: { sellerId: req.user.id },
		include: [
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
		order: [["createdAt", "DESC"]],
	});

	res.json({ listings: listings.map((item) => normalizeListingPayload(item)) });
});

export const getListingById = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id, {
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: [
					"id",
					"name",
					"avatar",
					"phone",
					"email",
					"location",
					"createdAt",
				],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
	});

	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	await listing.increment("views");
	await listing.reload();

	const refreshed = await models.Listing.findByPk(req.params.id, {
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: [
					"id",
					"name",
					"avatar",
					"phone",
					"email",
					"location",
					"createdAt",
				],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
	});

	res.json({ listing: normalizeListingPayload(refreshed) });
});

export const createListing = asyncHandler(async (req, res) => {
	const {
		title,
		description,
		subtitle,
		price,
		originalPrice,
		category,
		address,
		location,
		condition,
		premiumBoost,
		specs,
	} = req.body;

	if (!title || !description || !price || !category) {
		return res.status(400).json({
			message: "title, description, price, and category are required",
		});
	}

	const categoryId = await resolveCategoryId(category);
	if (!categoryId) {
		return res.status(400).json({ message: "Invalid category" });
	}

	let images = [];
	if (req.files?.length) {
		const uploaded = await Promise.all(
			req.files.map((file) => uploadToR2(file, "dealpost/listings")),
		);
		images = uploaded;
	}

	const listing = await models.Listing.create({
		title,
		description,
		subtitle,
		price,
		originalPrice: originalPrice || null,
		categoryId,
		location: {
			name: address || location || "Not specified",
		},
		condition: condition || "Good",
		premiumBoost: String(premiumBoost) === "true",
		isFeatured: String(premiumBoost) === "true",
		specs: parseMaybeJson(specs, {}),
		images,
		sellerId: req.user.id,
	});

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "avatar"],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
	});

	res.status(201).json({ listing: normalizeListingPayload(hydrated) });
});

export const patchListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Not found" });
	}

	const isOwner = Number(listing.sellerId) === Number(req.user.id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);

	if (!isOwner && !isAdmin) {
		return res.status(403).json({ message: "Forbidden" });
	}

	const allowedFields = [
		"status",
		"title",
		"description",
		"price",
		"condition",
	];
	for (const field of allowedFields) {
		if (req.body[field] !== undefined) {
			listing[field] = req.body[field];
		}
	}

	await listing.save();

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "avatar", "email"],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
	});

	res.json({ listing: normalizeListingPayload(hydrated) });
});

export const updateListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Not found" });
	}

	if (Number(listing.sellerId) !== Number(req.user.id)) {
		return res.status(403).json({ message: "Forbidden" });
	}

	const {
		title,
		description,
		subtitle,
		price,
		originalPrice,
		category,
		address,
		condition,
		specs,
		status,
	} = req.body;

	if (title !== undefined) listing.title = title;
	if (description !== undefined) listing.description = description;
	if (subtitle !== undefined) listing.subtitle = subtitle;
	if (price !== undefined) listing.price = price;
	if (originalPrice !== undefined) listing.originalPrice = originalPrice;
	if (condition !== undefined) listing.condition = condition;
	if (status !== undefined) listing.status = status;
	if (address !== undefined) {
		listing.location = { ...(listing.location || {}), name: address };
	}
	if (specs !== undefined) {
		listing.specs = parseMaybeJson(specs, listing.specs || {});
	}

	if (category !== undefined) {
		const categoryId = await resolveCategoryId(category);
		if (categoryId) listing.categoryId = categoryId;
	}

	if (req.files?.length) {
		const uploaded = await Promise.all(
			req.files.map((file) => uploadToR2(file, "dealpost/listings")),
		);
		listing.images = uploaded;
	}

	await listing.save();

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "avatar", "email"],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name", "slug"],
			},
		],
	});

	res.json({ listing: normalizeListingPayload(hydrated) });
});

export const deleteListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Not found" });
	}

	const isOwner = Number(listing.sellerId) === Number(req.user.id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);
	if (!isOwner && !isAdmin) {
		return res.status(403).json({ message: "Forbidden" });
	}

	await listing.destroy();
	res.json({ message: "Listing deleted" });
});
