import { Op } from "sequelize";
import { env } from "../config/env.js";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidGstin, normalizeGstin } from "../utils/gstin.js";
import { createR2PresignedUpload, uploadToR2 } from "../utils/r2Upload.js";

const MAX_SEARCH_LENGTH = 200;
const MAX_PRICE = 100_000_000;
const OWNER_ALLOWED_STATUSES = ["active", "sold", "pending"];
const ADMIN_ALLOWED_STATUSES = ["active", "sold", "pending", "removed"];
const VALID_SORTS = [
	"Newest",
	"Price Low-High",
	"Price High-Low",
	"Most Popular",
	"Auction Ending Soon",
];
const LIKE_COUNTS_TTL_MS = 30_000;
const listingSummaryAttributes = [
	"id",
	"productId",
	"title",
	"parentCategory",
	"subCategory",
	"price",
	"listingType",
	"startingBid",
	"currentBid",
	"auctionEndsAt",
	"images",
	"location",
	"condition",
	"status",
	"views",
	"isFeatured",
	"premiumBoost",
	"createdAt",
	"updatedAt",
	"sellerId",
	"categoryId",
];
let likeCountsCache = {
	ts: 0,
	map: new Map(),
};

// ---------------------------------------------------------------------------
// Sort map matching the frontend Explore page sort options
// ---------------------------------------------------------------------------
const sortMap = {
	Newest: [["createdAt", "DESC"]],
	"Price Low-High": [["price", "ASC"]],
	"Price High-Low": [["price", "DESC"]],
	"Most Popular": [["views", "DESC"]],
	"Auction Ending Soon": [
		["auctionEndsAt", "ASC"],
		["createdAt", "DESC"],
	],
};

function parseAuctionBids(raw) {
	const parsed = parseMaybeJson(raw, []);
	if (!Array.isArray(parsed)) return [];

	return parsed
		.map((entry) => {
			if (!entry || typeof entry !== "object") return null;
			const amount = toFiniteNumber(entry.amount);
			const userId = toFiniteNumber(entry.userId);
			const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
			if (!Number.isFinite(amount) || !Number.isFinite(userId)) return null;
			return {
				userId,
				amount,
				createdAt:
					createdAt && !Number.isNaN(createdAt.getTime())
						? createdAt.toISOString()
						: new Date().toISOString(),
			};
		})
		.filter(Boolean)
		.sort((a, b) => Number(b.amount) - Number(a.amount));
}

function normalizeListingType(value) {
	return String(value || "fixed").toLowerCase() === "auction"
		? "auction"
		: "fixed";
}

function computeAuctionMeta(listing) {
	if (!listing || normalizeListingType(listing.listingType) !== "auction") {
		return null;
	}

	const now = Date.now();
	const endAt = listing.auctionEndsAt ? new Date(listing.auctionEndsAt) : null;
	const endMs =
		endAt && !Number.isNaN(endAt.getTime()) ? endAt.getTime() : null;
	const isEnded = !Number.isFinite(endMs) || endMs <= now;
	const startingBid = toFiniteNumber(listing.startingBid);
	const currentBid = toFiniteNumber(listing.currentBid);
	const bids = parseAuctionBids(listing.auctionBids);
	const topBid = bids[0]?.amount;
	const effectiveCurrentBid =
		currentBid ?? topBid ?? startingBid ?? toFiniteNumber(listing.price);
	const minNextBid = Number(
		((effectiveCurrentBid || startingBid || 0) + 1).toFixed(2),
	);

	return {
		startingBid,
		currentBid: effectiveCurrentBid,
		endsAt: endAt ? endAt.toISOString() : null,
		isEnded,
		minNextBid,
		bidCount: bids.length,
	};
}

// ---------------------------------------------------------------------------
// Normalize a listing row for consistent frontend shape
// Frontend expects: _id, category (string name), categoryObj, seller, businessName
// ---------------------------------------------------------------------------
function toPlain(item) {
	if (!item) return item;
	return typeof item.toJSON === "function" ? item.toJSON() : item;
}

function splitCategoryPath(value) {
	if (!value) return { parentCategory: null, subCategory: null };
	const parts = String(value)
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean);
	if (!parts.length) return { parentCategory: null, subCategory: null };
	if (parts.length === 1) {
		return { parentCategory: parts[0], subCategory: null };
	}
	return {
		parentCategory: parts[0],
		subCategory: parts.slice(1).join(" > "),
	};
}

function joinCategoryPath(parentCategory, subCategory) {
	if (!parentCategory) return null;
	return subCategory
		? `${String(parentCategory).trim()} > ${String(subCategory).trim()}`
		: String(parentCategory).trim();
}

function normalizeListingPayload(item) {
	const listing = toPlain(item);
	if (!listing) return listing;
	const normalizedImages = normalizeIncomingImages(listing.images);

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

	const fallbackPath = categoryObj?.name || listing.category || null;
	const fallbackSplit = splitCategoryPath(fallbackPath);
	const parentCategory =
		listing.parentCategory || fallbackSplit.parentCategory || "General";
	const subCategory = listing.subCategory ?? fallbackSplit.subCategory ?? null;
	const categoryLabel =
		joinCategoryPath(parentCategory, subCategory) || "General";
	const normalizedProductId =
		String(listing.productId || "").trim() ||
		(Number.isFinite(Number(listing.id))
			? `DP-${String(listing.id).padStart(8, "0")}`
			: "");

	return {
		...listing,
		images: normalizedImages,
		image: listing.image || normalizedImages[0]?.url || null,
		_id: listing.id, // frontend uses both _id and id
		productId: normalizedProductId,
		listingType: normalizeListingType(listing.listingType),
		startingBid: toFiniteNumber(listing.startingBid),
		currentBid: toFiniteNumber(listing.currentBid),
		auctionEndsAt: listing.auctionEndsAt || null,
		auctionBids: parseAuctionBids(listing.auctionBids),
		auction: computeAuctionMeta(listing),
		category: categoryLabel,
		parentCategory,
		subCategory,
		...(categoryObj ? { categoryObj } : {}),
		...(sellerObj ? { seller: sellerObj } : {}),
		businessName:
			sellerObj?.businessName ||
			sellerObj?.name ||
			listing.businessName ||
			null,
	};
}

async function findListingByIdentifier(
	identifier,
	include = listingIncludes(),
	attributes,
) {
	const numericId = Number(identifier);
	if (Number.isFinite(numericId) && numericId > 0) {
		return models.Listing.findByPk(numericId, { include, attributes });
	}

	return models.Listing.findOne({
		where: { productId: String(identifier).trim() },
		include,
		attributes,
	});
}

function toListingProductId(listingId) {
	return `DP-${String(listingId).padStart(8, "0")}`;
}

function normalizeLikedListingIds(rawIds) {
	const parsed = parseMaybeJson(rawIds, []);
	if (!Array.isArray(parsed)) return [];
	return Array.from(
		new Set(
			parsed
				.map((value) => Number(value))
				.filter((value) => Number.isFinite(value) && value > 0),
		),
	);
}

function invalidateLikeCountsCache() {
	likeCountsCache = {
		ts: 0,
		map: new Map(),
	};
}

async function getCachedGlobalLikeCounts() {
	if (Date.now() - likeCountsCache.ts < LIKE_COUNTS_TTL_MS) {
		return likeCountsCache.map;
	}

	const users = await models.User.findAll({ attributes: ["likedListingIds"] });
	const nextMap = new Map();

	for (const user of users) {
		const likedIds = normalizeLikedListingIds(user?.likedListingIds);
		for (const likedId of likedIds) {
			nextMap.set(likedId, (nextMap.get(likedId) || 0) + 1);
		}
	}

	likeCountsCache = {
		ts: Date.now(),
		map: nextMap,
	};

	return likeCountsCache.map;
}

async function buildListingLikeCountMap(listingIds = []) {
	const uniqueIds = Array.from(
		new Set(
			listingIds
				.map((value) => Number(value))
				.filter((value) => Number.isFinite(value) && value > 0),
		),
	);

	const countMap = new Map(uniqueIds.map((id) => [id, 0]));
	if (!uniqueIds.length) return countMap;

	const globalCounts = await getCachedGlobalLikeCounts();
	for (const likedId of uniqueIds) {
		countMap.set(likedId, globalCounts.get(likedId) || 0);
	}

	return countMap;
}

function enrichListingWithLikeMeta(
	listing,
	{ countMap, currentUserLikedIds = [] },
) {
	if (!listing) return listing;

	const listingId = Number(listing?.id || listing?._id);
	const likedByCount = Number.isFinite(listingId)
		? countMap.get(listingId) || 0
		: 0;
	const likedIdSet = new Set(normalizeLikedListingIds(currentUserLikedIds));

	return {
		...listing,
		likedByCount,
		isLiked: Number.isFinite(listingId) ? likedIdSet.has(listingId) : false,
	};
}

async function enrichListingsWithLikeMeta(listings, currentUserLikedIds = []) {
	if (!Array.isArray(listings) || !listings.length) return [];

	const listingIds = listings
		.map((listing) => Number(listing?.id || listing?._id))
		.filter((id) => Number.isFinite(id) && id > 0);
	const countMap = await buildListingLikeCountMap(listingIds);

	return listings.map((listing) =>
		enrichListingWithLikeMeta(listing, {
			countMap,
			currentUserLikedIds,
		}),
	);
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

function sanitizeSpecs(raw) {
	const parsed = parseMaybeJson(raw, {});
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

	const entries = Object.entries(parsed).slice(0, 30);
	return Object.fromEntries(
		entries.map(([key, val]) => [
			String(key || "")
				.trim()
				.slice(0, 100),
			String(val ?? "")
				.trim()
				.slice(0, 500),
		]),
	);
}

function normalizeIncomingImages(value) {
	const parsed = parseMaybeJson(value, []);
	if (!Array.isArray(parsed)) return [];

	return parsed
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const url = String(item.url || item.src || "").trim();
			if (!url) return null;
			const publicId = String(item.public_id || item.publicId || "").trim();
			return {
				url,
				...(publicId ? { public_id: publicId } : {}),
			};
		})
		.filter(Boolean);
}

function toFiniteNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseRadiusKm(value) {
	if (value === undefined || value === null || value === "") return null;
	const match = String(value).match(/[\d.]+/);
	if (!match) return null;
	const km = Number(match[0]);
	return Number.isFinite(km) && km > 0 ? km : null;
}

function extractListingCoordinates(locationValue) {
	if (!locationValue || typeof locationValue !== "object") {
		return null;
	}

	const lat =
		toFiniteNumber(locationValue.lat) ?? toFiniteNumber(locationValue.latitude);
	const lng =
		toFiniteNumber(locationValue.lng) ??
		toFiniteNumber(locationValue.longitude);

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	return { lat, lng };
}

function distanceKmBetween(lat1, lng1, lat2, lng2) {
	const toRad = (deg) => (deg * Math.PI) / 180;
	const earthRadiusKm = 6371;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return earthRadiusKm * c;
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

async function resolveCategorySelection({
	parentCategory,
	subCategory,
	category,
}) {
	const parsed = splitCategoryPath(category);
	const normalizedParent = parentCategory || parsed.parentCategory || null;
	const normalizedSub =
		subCategory !== undefined && subCategory !== null
			? String(subCategory).trim() || null
			: parsed.subCategory;

	const lookup =
		joinCategoryPath(normalizedParent, normalizedSub) ||
		normalizedParent ||
		category;

	let categoryId = await resolveCategoryId(lookup);
	if (!categoryId && normalizedParent) {
		categoryId = await resolveCategoryId(normalizedParent);
	}

	return {
		parentCategory: normalizedParent,
		subCategory: normalizedSub,
		categoryId,
	};
}

// ---------------------------------------------------------------------------
// Standard seller + category includes
// ---------------------------------------------------------------------------
const sellerAttributes = [
	"id",
	"name",
	"businessName",
	"avatar",
	"location",
	"createdAt",
];
const categoryAttributes = ["id", "name", "slug"];
const lightweightSellerAttributes = ["id", "name", "businessName", "avatar"];

function listingIncludes(sellerAttrs = sellerAttributes) {
	return [
		{ model: models.User, as: "seller", attributes: sellerAttrs },
		{ model: models.Category, as: "category", attributes: categoryAttributes },
	];
}

// ---------------------------------------------------------------------------
// POST /api/listings/uploads/presign  — generate signed R2 URL for direct upload
// ---------------------------------------------------------------------------
export const presignListingImageUpload = asyncHandler(async (req, res) => {
	const { fileName, contentType } = req.body || {};
	const allowedContentTypes = new Set([
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/avif",
		"image/gif",
	]);

	if (
		!contentType ||
		!allowedContentTypes.has(String(contentType).toLowerCase())
	) {
		return res
			.status(400)
			.json({ message: "A valid image contentType is required" });
	}

	const signed = await createR2PresignedUpload({
		folder: "dealpost/listings",
		fileName,
		contentType,
	});

	res.status(201).json(signed);
});

// ---------------------------------------------------------------------------
// POST /api/listings/uploads/direct  — server-side upload fallback when R2 CORS blocks browser PUT
// ---------------------------------------------------------------------------
export const directListingImageUpload = asyncHandler(async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ message: "Image file is required" });
	}

	const uploaded = await uploadToR2(req.file, "dealpost/listings");
	res.status(201).json(uploaded);
});

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
		listingType,
		radius,
		originLat,
		originLng,
		minPrice,
		maxPrice,
		condition,
		sort = "Newest",
		userId,
		page = 1,
		limit = 20,
	} = req.query;

	const where = {};
	const safeSort = VALID_SORTS.includes(String(sort)) ? String(sort) : "Newest";
	const isPrivateFeed = Boolean(req.user) || userId === "me";
	res.setHeader(
		"Cache-Control",
		isPrivateFeed
			? "private, no-store"
			: "public, max-age=60, stale-while-revalidate=300",
	);

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
	const searchTerm = String(q || search || "")
		.trim()
		.slice(0, MAX_SEARCH_LENGTH);
	if (searchTerm.length > 0) {
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
			const categoryConditions = [];

			const topLevelParents = categoryNames.filter(
				(name) => !name.includes(">"),
			);
			if (topLevelParents.length) {
				categoryConditions.push({
					parentCategory: { [Op.in]: topLevelParents },
				});
			}

			for (const name of categoryNames.filter((value) => value.includes(">"))) {
				const split = splitCategoryPath(name);
				if (split.parentCategory && split.subCategory) {
					categoryConditions.push({
						parentCategory: split.parentCategory,
						[Op.or]: [
							{ subCategory: split.subCategory },
							{ subCategory: { [Op.like]: `${split.subCategory} > %` } },
						],
					});
				}
			}

			const foundCategories = await models.Category.findAll({
				where: { name: { [Op.in]: categoryNames } },
			});
			const ids = foundCategories.map((c) => c.id);
			if (ids.length) {
				categoryConditions.push({ categoryId: { [Op.in]: ids } });
			}

			if (categoryConditions.length) {
				where[Op.and] = [
					...(where[Op.and] || []),
					{ [Op.or]: categoryConditions },
				];
			} else {
				// No matching categories — return empty
				return res.json({ listings: [], total: 0, page: 1, pages: 0 });
			}
		}
	}

	if (condition) {
		where.condition = condition;
	}

	if (listingType) {
		const normalizedType = normalizeListingType(listingType);
		where.listingType = normalizedType;
	}

	if (minPrice || maxPrice) {
		where.price = {};
		if (minPrice) where.price[Op.gte] = Number(minPrice);
		if (maxPrice) where.price[Op.lte] = Number(maxPrice);
	}

	const numericPage = Math.max(Number(page) || 1, 1);
	const numericLimit = Math.min(Number(limit) || 20, 100);
	const offset = (numericPage - 1) * numericLimit;
	const radiusKm = parseRadiusKm(radius);
	const originLatitude = toFiniteNumber(originLat);
	const originLongitude = toFiniteNumber(originLng);
	const canApplyDistanceFilter =
		Number.isFinite(originLatitude) &&
		Number.isFinite(originLongitude) &&
		Number.isFinite(radiusKm);

	if (canApplyDistanceFilter) {
		const rows = await models.Listing.findAll({
			where,
			attributes: listingSummaryAttributes,
			include: listingIncludes(lightweightSellerAttributes),
			order: sortMap[safeSort],
		});
		const currentUserLikedIds = normalizeLikedListingIds(
			req.user?.likedListingIds,
		);
		const countMap = await buildListingLikeCountMap(rows.map((row) => row?.id));
		const normalizedRows = rows.map((row) =>
			enrichListingWithLikeMeta(normalizeListingPayload(row), {
				countMap,
				currentUserLikedIds,
			}),
		);

		const withinRadius = normalizedRows
			.map((listing) => {
				const coords = extractListingCoordinates(listing.location);
				if (!coords) return null;

				const distanceKm = distanceKmBetween(
					originLatitude,
					originLongitude,
					coords.lat,
					coords.lng,
				);

				if (distanceKm > radiusKm) return null;

				return {
					...listing,
					distanceKm: Number(distanceKm.toFixed(2)),
				};
			})
			.filter(Boolean);

		const total = withinRadius.length;
		const pagedRows = withinRadius.slice(offset, offset + numericLimit);

		return res.json({
			listings: pagedRows,
			total,
			page: numericPage,
			pages: Math.ceil(total / numericLimit),
		});
	}

	const { rows, count } = await models.Listing.findAndCountAll({
		where,
		attributes: listingSummaryAttributes,
		include: listingIncludes(lightweightSellerAttributes),
		order: sortMap[safeSort],
		offset,
		limit: numericLimit,
		distinct: true, // important for accurate count with includes
	});
	const normalizedRows = rows.map(normalizeListingPayload);
	const enrichedRows = await enrichListingsWithLikeMeta(
		normalizedRows,
		req.user?.likedListingIds,
	);

	res.json({
		listings: enrichedRows,
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
			{
				model: models.Category,
				as: "category",
				attributes: categoryAttributes,
			},
		],
		order: [["createdAt", "DESC"]],
	});
	const normalizedListings = listings.map(normalizeListingPayload);
	const enrichedListings = await enrichListingsWithLikeMeta(
		normalizedListings,
		req.user?.likedListingIds,
	);

	res.json({ listings: enrichedListings });
});

// ---------------------------------------------------------------------------
// GET /api/listings/:id  — single listing, increments view count
// ---------------------------------------------------------------------------
export const getListingById = asyncHandler(async (req, res) => {
	res.setHeader("Cache-Control", "private, no-store");
	const listing = await findListingByIdentifier(
		req.params.id,
		listingIncludes(),
	);

	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	// Increment views atomically
	await listing.increment("views");
	await listing.reload({ include: listingIncludes() });
	const normalized = normalizeListingPayload(listing);
	const [enriched] = await enrichListingsWithLikeMeta(
		[normalized],
		req.user?.likedListingIds,
	);

	res.json({ listing: enriched || normalized });
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
		listingType,
		startingBid,
		auctionEndsAt,
		originalPrice,
		parentCategory,
		subCategory,
		category,
		address,
		location,
		condition,
		additionalNotes,
		specs,
		images: incomingImages,
		latitude,
		longitude,
		placeId,
		area,
		city,
		state,
		pincode,
		street,
		displayAddress,
		formattedAddress,
		addressComponents,
	} = req.body;

	const normalizedListingType = normalizeListingType(listingType);
	const isAuctionListing = normalizedListingType === "auction";
	const isBusinessAccount =
		String(req.user?.accountType || "").toLowerCase() === "business";

	if (isBusinessAccount) {
		const sellerBusinessName = String(req.user?.businessName || "").trim();
		const sellerGstin = normalizeGstin(req.user?.gstOrMsme);

		if (!sellerBusinessName) {
			return res.status(400).json({
				message:
					"Complete business verification before posting: business name is missing",
			});
		}

		if (!sellerGstin) {
			return res.status(400).json({
				message:
					"Complete business verification before posting: GST/MSME number is required",
			});
		}

		if (
			!isValidGstin(sellerGstin, {
				requireChecksum: env.GSTIN_VALIDATE_CHECKSUM,
			})
		) {
			return res.status(400).json({
				message: env.GSTIN_VALIDATE_CHECKSUM
					? "Complete business verification before posting: GST/MSME number is invalid"
					: "Complete business verification before posting: provide valid GSTIN or MSME UDYAM number",
			});
		}
	}

	if (!title || !description || !(parentCategory || category)) {
		return res.status(400).json({
			message: "title, description, and parentCategory are required",
		});
	}

	const basePriceInput = isAuctionListing ? startingBid : price;
	const numericPrice = Number(basePriceInput);
	const minAllowedPrice = isAuctionListing ? 1 : 0;
	if (
		!Number.isFinite(numericPrice) ||
		numericPrice < minAllowedPrice ||
		numericPrice > MAX_PRICE
	) {
		return res.status(400).json({
			message: isAuctionListing
				? `Starting bid must be between 1 and ${MAX_PRICE}`
				: `Price must be between 0 and ${MAX_PRICE}`,
		});
	}

	let normalizedAuctionEndsAt = null;
	if (isAuctionListing) {
		const parsedEndsAt = auctionEndsAt ? new Date(auctionEndsAt) : null;
		if (!parsedEndsAt || Number.isNaN(parsedEndsAt.getTime())) {
			return res
				.status(400)
				.json({ message: "Auction end date/time is required" });
		}

		if (parsedEndsAt.getTime() <= Date.now()) {
			return res
				.status(400)
				.json({ message: "Auction end date/time must be in the future" });
		}

		normalizedAuctionEndsAt = parsedEndsAt;
	}

	const numericOriginalPrice =
		originalPrice !== undefined &&
		originalPrice !== null &&
		originalPrice !== ""
			? Number(originalPrice)
			: null;
	if (
		!isAuctionListing &&
		numericOriginalPrice !== null &&
		(!Number.isFinite(numericOriginalPrice) ||
			numericOriginalPrice <= numericPrice ||
			numericOriginalPrice > MAX_PRICE)
	) {
		return res.status(400).json({
			message:
				"Original price must be higher than current price and within range",
		});
	}

	const resolvedCategory = await resolveCategorySelection({
		parentCategory,
		subCategory,
		category,
	});
	const selectedPath =
		joinCategoryPath(
			resolvedCategory.parentCategory,
			resolvedCategory.subCategory,
		) || category;

	const categoryId = resolvedCategory.categoryId;
	if (!categoryId) {
		return res.status(400).json({
			message: `Category "${selectedPath}" not found. Please select a valid category.`,
		});
	}

	// Accept pre-uploaded R2 URLs from JSON body and/or multipart image files.
	const bodyImages = normalizeIncomingImages(incomingImages);
	let images = [...bodyImages];
	if (req.files?.length) {
		const uploaded = await Promise.all(
			req.files.map((file) => uploadToR2(file, "dealpost/listings")),
		);
		images = [...images, ...uploaded];
	}
	images = images.filter(
		(item, index, arr) =>
			arr.findIndex((candidate) => candidate?.url === item?.url) === index,
	);

	const boost = false;
	const parsedLatitude = toFiniteNumber(latitude);
	const parsedLongitude = toFiniteNumber(longitude);
	const locationPayload = {
		name: address || location || "Not specified",
	};
	if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
		locationPayload.lat = parsedLatitude;
		locationPayload.lng = parsedLongitude;
	}
	if (placeId) {
		locationPayload.placeId = String(placeId).trim();
	}
	if (area !== undefined) locationPayload.area = String(area || "").trim();
	if (city !== undefined) locationPayload.city = String(city || "").trim();
	if (state !== undefined) locationPayload.state = String(state || "").trim();
	if (pincode !== undefined) {
		locationPayload.pincode = String(pincode || "").trim();
	}
	if (street !== undefined)
		locationPayload.street = String(street || "").trim();
	if (displayAddress !== undefined) {
		locationPayload.displayAddress = String(displayAddress || "").trim();
	}
	if (formattedAddress !== undefined) {
		locationPayload.formattedAddress = String(formattedAddress || "").trim();
	}
	if (addressComponents !== undefined) {
		locationPayload.addressComponents = Array.isArray(addressComponents)
			? addressComponents
			: parseMaybeJson(addressComponents, []);
	}

	const listing = await models.Listing.create({
		productId: null,
		title: title.trim(),
		description: description.trim(),
		additionalNotes: additionalNotes ? String(additionalNotes).trim() : null,
		listingType: normalizedListingType,
		parentCategory: resolvedCategory.parentCategory,
		subCategory: resolvedCategory.subCategory,
		subtitle: subtitle?.trim() || null,
		price: numericPrice,
		startingBid: isAuctionListing ? numericPrice : null,
		currentBid: isAuctionListing ? numericPrice : null,
		auctionEndsAt: normalizedAuctionEndsAt,
		auctionBids: [],
		originalPrice: isAuctionListing ? null : numericOriginalPrice,
		categoryId,
		location: locationPayload,
		condition: condition || "Good",
		premiumBoost: boost,
		isFeatured: boost,
		specs: sanitizeSpecs(specs),
		images,
		sellerId: req.user.id,
	});

	if (!listing.productId) {
		listing.productId = toListingProductId(listing.id);
		await listing.save();
	}

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: listingIncludes(["id", "name", "avatar"]),
	});
	const normalized = normalizeListingPayload(hydrated);
	const [enriched] = await enrichListingsWithLikeMeta(
		[normalized],
		req.user?.likedListingIds,
	);

	res.status(201).json({ listing: enriched || normalized });
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

	const allowedFields = [
		"status",
		"title",
		"description",
		"price",
		"condition",
	];
	for (const field of allowedFields) {
		if (req.body[field] !== undefined) {
			if (field === "status") {
				const nextStatus = String(req.body.status || "");
				const allowed = isAdmin
					? ADMIN_ALLOWED_STATUSES
					: OWNER_ALLOWED_STATUSES;
				if (!allowed.includes(nextStatus)) {
					return res
						.status(403)
						.json({ message: "You cannot set this status" });
				}
				listing.status = nextStatus;
				continue;
			}

			if (field === "price") {
				const numeric = Number(req.body.price);
				const isAuctionListing =
					normalizeListingType(listing.listingType) === "auction";
				const minAllowedPrice = isAuctionListing ? 1 : 0;
				if (
					!Number.isFinite(numeric) ||
					numeric < minAllowedPrice ||
					numeric > MAX_PRICE
				) {
					return res.status(400).json({ message: "Invalid price" });
				}
				listing.price = numeric;
				continue;
			}

			listing[field] = req.body[field];
		}
	}

	await listing.save();

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: listingIncludes(["id", "name", "avatar"]),
	});
	const normalized = normalizeListingPayload(hydrated);
	const [enriched] = await enrichListingsWithLikeMeta(
		[normalized],
		req.user?.likedListingIds,
	);

	res.json({ listing: enriched || normalized });
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
		additionalNotes,
		subtitle,
		price,
		listingType,
		startingBid,
		auctionEndsAt,
		originalPrice,
		parentCategory,
		subCategory,
		category,
		address,
		location,
		latitude,
		longitude,
		placeId,
		area,
		city,
		state,
		pincode,
		street,
		displayAddress,
		formattedAddress,
		addressComponents,
		condition,
		specs,
		images: incomingImages,
		status,
	} = req.body;

	const nextListingType =
		listingType !== undefined
			? normalizeListingType(listingType)
			: normalizeListingType(listing.listingType);
	const isAuctionListing = nextListingType === "auction";
	if (listingType !== undefined) {
		listing.listingType = nextListingType;
	}

	if (title !== undefined) listing.title = title.trim();
	if (description !== undefined) listing.description = description.trim();
	if (additionalNotes !== undefined) {
		listing.additionalNotes = additionalNotes
			? String(additionalNotes).trim()
			: null;
	}
	if (subtitle !== undefined) listing.subtitle = subtitle?.trim() || null;
	if (price !== undefined && !isAuctionListing) {
		const numericPrice = Number(price);
		if (
			!Number.isFinite(numericPrice) ||
			numericPrice < 0 ||
			numericPrice > MAX_PRICE
		) {
			return res.status(400).json({ message: "Invalid price" });
		}
		listing.price = numericPrice;
	}
	if (isAuctionListing && (startingBid !== undefined || price !== undefined)) {
		const numericStartingBid = Number(
			startingBid !== undefined
				? startingBid
				: listing.startingBid || listing.price,
		);
		if (
			!Number.isFinite(numericStartingBid) ||
			numericStartingBid <= 0 ||
			numericStartingBid > MAX_PRICE
		) {
			return res.status(400).json({ message: "Invalid starting bid" });
		}
		listing.startingBid = numericStartingBid;
		listing.currentBid = Number.isFinite(Number(listing.currentBid))
			? Math.max(Number(listing.currentBid), numericStartingBid)
			: numericStartingBid;
		listing.price = numericStartingBid;
	}

	if (isAuctionListing && auctionEndsAt !== undefined) {
		if (!auctionEndsAt) {
			return res
				.status(400)
				.json({ message: "Auction end date/time is required" });
		}

		const parsedEndsAt = new Date(auctionEndsAt);
		if (Number.isNaN(parsedEndsAt.getTime())) {
			return res.status(400).json({ message: "Invalid auction end date/time" });
		}
		listing.auctionEndsAt = parsedEndsAt;
	}

	if (!isAuctionListing) {
		listing.startingBid = null;
		listing.currentBid = null;
		listing.auctionEndsAt = null;
		listing.auctionBids = [];
	}
	if (originalPrice !== undefined) {
		if (isAuctionListing) {
			listing.originalPrice = null;
		} else if (originalPrice === null || originalPrice === "") {
			listing.originalPrice = null;
		} else {
			const numericOriginal = Number(originalPrice);
			if (
				!Number.isFinite(numericOriginal) ||
				numericOriginal <= Number(listing.price) ||
				numericOriginal > MAX_PRICE
			) {
				return res.status(400).json({ message: "Invalid originalPrice" });
			}
			listing.originalPrice = numericOriginal;
		}
	}
	if (condition !== undefined) listing.condition = condition;
	if (status !== undefined) {
		const nextStatus = String(status || "");
		if (!OWNER_ALLOWED_STATUSES.includes(nextStatus)) {
			return res.status(403).json({ message: "You cannot set this status" });
		}
		listing.status = nextStatus;
	}
	if (
		address !== undefined ||
		location !== undefined ||
		latitude !== undefined ||
		longitude !== undefined ||
		placeId !== undefined ||
		area !== undefined ||
		city !== undefined ||
		state !== undefined ||
		pincode !== undefined ||
		street !== undefined ||
		displayAddress !== undefined ||
		formattedAddress !== undefined ||
		addressComponents !== undefined
	) {
		const parsedLatitude = toFiniteNumber(latitude);
		const parsedLongitude = toFiniteNumber(longitude);
		const nextLocation = { ...(listing.location || {}) };

		if (address !== undefined || location !== undefined) {
			nextLocation.name =
				address || location || nextLocation.name || "Not specified";
		}

		if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
			nextLocation.lat = parsedLatitude;
			nextLocation.lng = parsedLongitude;
		}

		if (placeId !== undefined) {
			if (placeId) nextLocation.placeId = String(placeId).trim();
			else delete nextLocation.placeId;
		}

		if (area !== undefined) nextLocation.area = String(area || "").trim();
		if (city !== undefined) nextLocation.city = String(city || "").trim();
		if (state !== undefined) nextLocation.state = String(state || "").trim();
		if (pincode !== undefined)
			nextLocation.pincode = String(pincode || "").trim();
		if (street !== undefined) nextLocation.street = String(street || "").trim();
		if (displayAddress !== undefined) {
			nextLocation.displayAddress = String(displayAddress || "").trim();
		}
		if (formattedAddress !== undefined) {
			nextLocation.formattedAddress = String(formattedAddress || "").trim();
		}
		if (addressComponents !== undefined) {
			nextLocation.addressComponents = Array.isArray(addressComponents)
				? addressComponents
				: parseMaybeJson(addressComponents, []);
		}

		listing.location = nextLocation;
	}
	if (specs !== undefined) {
		listing.specs = sanitizeSpecs(specs);
	}

	if (
		category !== undefined ||
		parentCategory !== undefined ||
		subCategory !== undefined
	) {
		const resolvedCategory = await resolveCategorySelection({
			parentCategory:
				parentCategory !== undefined ? parentCategory : listing.parentCategory,
			subCategory:
				subCategory !== undefined ? subCategory : listing.subCategory,
			category,
		});

		if (resolvedCategory.parentCategory) {
			listing.parentCategory = resolvedCategory.parentCategory;
		}
		listing.subCategory = resolvedCategory.subCategory;
		if (resolvedCategory.categoryId) {
			listing.categoryId = resolvedCategory.categoryId;
		}
	}

	const bodyImages = normalizeIncomingImages(incomingImages);
	if (req.files?.length) {
		const uploaded = await Promise.all(
			req.files.map((file) => uploadToR2(file, "dealpost/listings")),
		);
		listing.images = [...bodyImages, ...uploaded].filter(
			(item, index, arr) =>
				arr.findIndex((candidate) => candidate?.url === item?.url) === index,
		);
	} else if (incomingImages !== undefined) {
		listing.images = bodyImages;
	}

	if (isAuctionListing) {
		const endAt = listing.auctionEndsAt
			? new Date(listing.auctionEndsAt)
			: null;
		if (!endAt || Number.isNaN(endAt.getTime())) {
			return res
				.status(400)
				.json({ message: "Auction listings require a valid end date/time" });
		}
	}

	await listing.save();

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: listingIncludes(["id", "name", "avatar"]),
	});
	const normalized = normalizeListingPayload(hydrated);
	const [enriched] = await enrichListingsWithLikeMeta(
		[normalized],
		req.user?.likedListingIds,
	);

	res.json({ listing: enriched || normalized });
});

// ---------------------------------------------------------------------------
// POST /api/listings/:id/bids  — place a bid on auction listings
// ---------------------------------------------------------------------------
export const placeAuctionBid = asyncHandler(async (req, res) => {
	const listing = await findListingByIdentifier(
		req.params.id,
		listingIncludes(),
	);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	if (normalizeListingType(listing.listingType) !== "auction") {
		return res
			.status(400)
			.json({ message: "Bids can only be placed on auction listings" });
	}

	if (Number(listing.sellerId) === Number(req.user.id)) {
		return res
			.status(400)
			.json({ message: "You cannot bid on your own listing" });
	}

	if (String(listing.status) !== "active") {
		return res.status(400).json({ message: "This auction is not active" });
	}

	const endsAt = listing.auctionEndsAt ? new Date(listing.auctionEndsAt) : null;
	if (
		!endsAt ||
		Number.isNaN(endsAt.getTime()) ||
		endsAt.getTime() <= Date.now()
	) {
		return res.status(400).json({ message: "This auction has ended" });
	}

	const amount = Number(req.body?.amount);
	if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PRICE) {
		return res.status(400).json({ message: "Please enter a valid bid amount" });
	}

	const startingBid =
		toFiniteNumber(listing.startingBid) ?? toFiniteNumber(listing.price) ?? 0;
	const currentBid = toFiniteNumber(listing.currentBid) ?? startingBid;
	const minBid = Number((Math.max(startingBid, currentBid) + 1).toFixed(2));

	if (amount < minBid) {
		return res
			.status(400)
			.json({ message: `Your bid must be at least ${minBid}` });
	}

	const bids = parseAuctionBids(listing.auctionBids).slice(0, 99);
	bids.unshift({
		userId: Number(req.user.id),
		amount,
		createdAt: new Date().toISOString(),
	});

	listing.currentBid = amount;
	listing.auctionBids = bids;
	await listing.save();

	const hydrated = await models.Listing.findByPk(listing.id, {
		include: listingIncludes(),
	});
	const normalized = normalizeListingPayload(hydrated);
	const [enriched] = await enrichListingsWithLikeMeta(
		[normalized],
		req.user?.likedListingIds,
	);

	res.json({ listing: enriched || normalized });
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

// ---------------------------------------------------------------------------
// POST /api/listings/:id/like  — like/save a listing for current user
// ---------------------------------------------------------------------------
export const likeListing = asyncHandler(async (req, res) => {
	const listing = await findListingByIdentifier(req.params.id, []);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	const likedIds = normalizeLikedListingIds(req.user.likedListingIds);
	if (!likedIds.includes(Number(listing.id))) {
		likedIds.push(Number(listing.id));
		req.user.likedListingIds = likedIds;
		await req.user.save();
		invalidateLikeCountsCache();
	}
	const countMap = await buildListingLikeCountMap([listing.id]);
	const likedByCount = countMap.get(Number(listing.id)) || 0;

	res.json({ likedListingIds: likedIds, likedByCount });
});

// ---------------------------------------------------------------------------
// DELETE /api/listings/:id/like  — unlike/remove saved listing
// ---------------------------------------------------------------------------
export const unlikeListing = asyncHandler(async (req, res) => {
	const listing = await findListingByIdentifier(req.params.id, []);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	const likedIds = normalizeLikedListingIds(req.user.likedListingIds).filter(
		(id) => id !== Number(listing.id),
	);
	req.user.likedListingIds = likedIds;
	await req.user.save();
	invalidateLikeCountsCache();
	const countMap = await buildListingLikeCountMap([listing.id]);
	const likedByCount = countMap.get(Number(listing.id)) || 0;

	res.json({ likedListingIds: likedIds, likedByCount });
});

// ---------------------------------------------------------------------------
// GET /api/listings/liked/my  — fetch liked listings for profile page
// ---------------------------------------------------------------------------
export const getMyLikedListings = asyncHandler(async (req, res) => {
	const likedIds = normalizeLikedListingIds(req.user.likedListingIds);
	if (!likedIds.length) {
		return res.json({ listings: [] });
	}

	const rows = await models.Listing.findAll({
		where: { id: { [Op.in]: likedIds }, status: "active" },
		include: listingIncludes(),
	});

	const byId = new Map(rows.map((row) => [Number(row.id), row]));
	const ordered = likedIds
		.map((id) => byId.get(Number(id)))
		.filter(Boolean)
		.map((row) => normalizeListingPayload(row));
	const enriched = await enrichListingsWithLikeMeta(
		ordered,
		req.user?.likedListingIds,
	);

	res.json({ listings: enriched });
});
