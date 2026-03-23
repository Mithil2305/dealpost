import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToR2 } from "../utils/r2Upload.js";

// ---------------------------------------------------------------------------
// Sort map matching the frontend Explore page sort options
// ---------------------------------------------------------------------------
const sortMap = {
	Newest: [["createdAt", "DESC"]],
	"Price Low-High": [["price", "ASC"]],
	"Price High-Low": [["price", "DESC"]],
	"Most Popular": [["views", "DESC"]],
};

// ---------------------------------------------------------------------------
// Normalize a listing row for consistent frontend shape
// Frontend expects: _id, category (string name), categoryObj, seller, businessName
// ---------------------------------------------------------------------------
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
		_id: listing.id, // frontend uses both _id and id
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

// ---------------------------------------------------------------------------
// Resolve category ID from a name string or numeric ID
// ---------------------------------------------------------------------------
async function resolveCategoryId(categoryInput) {
	if (!categoryInput) return null;

	const numericId = Number(categoryInput);
	if (!Number.isNaN(numericId) && numericId > 0) {
		const byId = await models.Category.findByPk(numericId);
		if (byId) return byId.id;
	}

	// Try exact name match first
	const byExact = await models.Category.findOne({
		where: { name: String(categoryInput) },
	});
	if (byExact) return byExact.id;

	// Try case-insensitive LIKE
	const byName = await models.Category.findOne({
		where: { name: { [Op.like]: String(categoryInput) } },
	});
	return byName?.id || null;
}

// ---------------------------------------------------------------------------
// Standard seller + category includes
// ---------------------------------------------------------------------------
const sellerAttributes = [
	"id", "name", "avatar", "phone", "email", "location", "createdAt",
];
const categoryAttributes = ["id", "name", "slug"];

function listingIncludes(sellerAttrs = sellerAttributes) {
	return [
		{ model: models.User, as: "seller", attributes: sellerAttrs },
		{ model: models.Category, as: "category", attributes: categoryAttributes },
	];
}

// ---------------------------------------------------------------------------
// GET /api/listings
// Supports: q/search, category (comma-separated names), minPrice, maxPrice,
//           condition, sort, userId=me, page, limit
// ---------------------------------------------------------------------------
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

	// My Ads: when userId=me, show owner's listings regardless of status
	if (userId === "me") {
		if (!req.user) {
			return res.status(401).json({ message: "Authentication required" });
		}
		where.sellerId = req.user.id;
		// Do NOT filter by status — owner sees all statuses
	} else {
		// Public listing feed — active only
		where.status = "active";
	}

	// Full-text search on title + description
	const searchTerm = q || search;
	if (searchTerm) {
		where[Op.or] = [
			{ title: { [Op.like]: `%${searchTerm}%` } },
			{ description: { [Op.like]: `%${searchTerm}%` } },
		];
	}

	// Category filter (comma-separated category names from Explore page)
	if (category) {
		const categoryNames = String(category)
			.split(",")
			.map((v) => v.trim())
			.filter(Boolean);

		if (categoryNames.length) {
			const foundCategories = await models.Category.findAll({
				where: { name: { [Op.in]: categoryNames } },
			});
			const ids = foundCategories.map((c) => c.id);
			if (ids.length) {
				where.categoryId = { [Op.in]: ids };
			} else {
				// No matching categories — return empty
				return res.json({ listings: [], total: 0, page: 1, pages: 0 });
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

	const numericPage = Math.max(Number(page) || 1, 1);
	const numericLimit = Math.min(Number(limit) || 20, 100);
	const offset = (numericPage - 1) * numericLimit;

	const { rows, count } = await models.Listing.findAndCountAll({
		where,
		include: listingIncludes(),
		order: sortMap[sort] || sortMap.Newest,
		offset,
		limit: numericLimit,
		distinct: true, // important for accurate count with includes
	});

	res.json({
		listings: rows.map(normalizeListingPayload),
		total: count,
		page: numericPage,
		pages: Math.ceil(count / numericLimit),
	});
});

// ---------------------------------------------------------------------------
// GET /api/listings/my  — owner's own listings (all statuses)
// ---------------------------------------------------------------------------
export const getMyListings = asyncHandler(async (req, res) => {
	const listings = await models.Listing.findAll({
		where: { sellerId: req.user.id },
		include: [
			{ model: models.Category, as: "category", attributes: categoryAttributes },
		],
		order: [["createdAt", "DESC"]],
	});

	res.json({ listings: listings.map(normalizeListingPayload) });
});

// ---------------------------------------------------------------------------
// GET /api/listings/:id  — single listing, increments view count
// ---------------------------------------------------------------------------
export const getListingById = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id, {
		include: listingIncludes(),
	});

	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	// Increment views atomically
	await listing.increment("views");

	// Re-fetch to get updated views count
	const refreshed = await models.Listing.findByPk(req.params.id, {
		include: listingIncludes(),
	});

	res.json({ listing: normalizeListingPayload(refreshed) });
});

// ---------------------------------------------------------------------------
// POST /api/listings  — create listing with optional image uploads
// Body: title, description, subtitle, price, originalPrice, category,
//       address/location, condition, premiumBoost, specs (JSON string)
// Files: images[] (multipart/form-data, max 6)
// ---------------------------------------------------------------------------
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

	if (Number(price) <= 0) {
		return res.status(400).json({ message: "Price must be greater than 0" });
	}

	const categoryId = await resolveCategoryId(category);
	if (!categoryId) {
		return res.status(400).json({
			message: `Category "${category}" not found. Please select a valid category.`,
		});
	}

	// Upload images to Cloudflare R2
	let images = [];
	if (req.files?.length) {
		const uploaded = await Promise.all(
			req.files.map((file) => uploadToR2(file, "dealpost/listings")),
		);
		images = uploaded;
	}

	const boost = String(premiumBoost) === "true";

	const listing = await models.Listing.create({
		title: title.trim(),
		description: description.trim(),
		subtitle: subtitle?.trim() || null,
		price: Number(price),
		originalPrice: originalPrice ? Number(originalPrice) : null,
		categoryId,
		location: { name: address || location || "Not specified" },
		condition: condition || "Good",
		premiumBoost: boost,
		isFeatured: boost,
		specs: parseMaybeJson(specs, {}),
		images,
		sellerId: req.user.id,
	});

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: listingIncludes(["id", "name", "avatar"]),
	});

	res.status(201).json({ listing: normalizeListingPayload(hydrated) });
});

// ---------------------------------------------------------------------------
// PATCH /api/listings/:id  — partial update (used by MyAds for status changes)
// Allowed fields: status, title, description, price, condition
// ---------------------------------------------------------------------------
export const patchListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	const isOwner = Number(listing.sellerId) === Number(req.user.id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);

	if (!isOwner && !isAdmin) {
		return res.status(403).json({ message: "Forbidden" });
	}

	const allowedFields = ["status", "title", "description", "price", "condition"];
	for (const field of allowedFields) {
		if (req.body[field] !== undefined) {
			listing[field] = req.body[field];
		}
	}

	await listing.save();

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: listingIncludes(["id", "name", "avatar", "email"]),
	});

	res.json({ listing: normalizeListingPayload(hydrated) });
});

// ---------------------------------------------------------------------------
// PUT /api/listings/:id  — full update (owner only, supports new image uploads)
// ---------------------------------------------------------------------------
export const updateListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
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

	if (title !== undefined) listing.title = title.trim();
	if (description !== undefined) listing.description = description.trim();
	if (subtitle !== undefined) listing.subtitle = subtitle?.trim() || null;
	if (price !== undefined) listing.price = Number(price);
	if (originalPrice !== undefined)
		listing.originalPrice = originalPrice ? Number(originalPrice) : null;
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
		include: listingIncludes(["id", "name", "avatar", "email"]),
	});

	res.json({ listing: normalizeListingPayload(hydrated) });
});

// ---------------------------------------------------------------------------
// DELETE /api/listings/:id  — owner or admin
// ---------------------------------------------------------------------------
export const deleteListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	const isOwner = Number(listing.sellerId) === Number(req.user.id);
	const isAdmin = ["admin", "developer"].includes(req.user.role);
	if (!isOwner && !isAdmin) {
		return res.status(403).json({ message: "Forbidden" });
	}

	await listing.destroy();
	res.json({ message: "Listing deleted" });
});
