import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeGstin } from "../utils/gstin.js";
import { uploadToR2 } from "../utils/r2Upload.js";

const toBusinessPayload = (business) => ({
	id: business.id,
	ownerId: business.ownerId,
	businessName: business.businessName,
	businessLogo: business.businessLogo || "",
	businessBanner: business.businessBanner || "",
	businessLatitude:
		business.businessLatitude !== null &&
		business.businessLatitude !== undefined
			? Number(business.businessLatitude)
			: null,
	businessLongitude:
		business.businessLongitude !== null &&
		business.businessLongitude !== undefined
			? Number(business.businessLongitude)
			: null,
	businessPlaceId: business.businessPlaceId || null,
	businessLocationUrl: business.businessLocationUrl || "",
	location: business.location || "Not specified",
	category: business.category || "",
	additionalCategory: business.additionalCategory || "",
	description: business.description || "",
	gstOrMsme: business.gstOrMsme || null,
	createdAt: business.createdAt,
});

const toLegacyBusinessPayload = (user) => ({
	id: `legacy-${user.id}`,
	ownerId: user.id,
	businessName: user.businessName || user.name || "",
	businessLogo: user.avatar || "",
	businessBanner: user.businessBanner || "",
	businessLatitude:
		user.businessLatitude !== null && user.businessLatitude !== undefined
			? Number(user.businessLatitude)
			: null,
	businessLongitude:
		user.businessLongitude !== null && user.businessLongitude !== undefined
			? Number(user.businessLongitude)
			: null,
	businessPlaceId: user.businessPlaceId || null,
	businessLocationUrl: user.businessLocationUrl || "",
	location: user.location || "Not specified",
	category: "",
	additionalCategory: "",
	description: "",
	gstOrMsme: user.gstOrMsme || null,
	createdAt: user.createdAt,
	name: user.name || "",
	email: user.email || null,
	avatar: user.avatar || "",
	ownerAvatar: user.avatar || "",
	listingCount: 0,
});

export const getBusinesses = asyncHandler(async (req, res) => {
	const page = Math.max(Number(req.query.page) || 1, 1);
	const limit = Math.min(Number(req.query.limit) || 20, 50);
	const offset = (page - 1) * limit;

	const businesses = await models.Business.findAndCountAll({
		where: {
			isActive: true,
		},
		include: [
			{
				model: models.User,
				as: "owner",
				attributes: ["id", "name", "email", "avatar", "isActive"],
				required: true,
				where: { isActive: true },
			},
		],
		order: [["createdAt", "DESC"]],
		limit,
		offset,
	});

	const ownerIds = [
		...new Set(
			businesses.rows
				.map((business) => Number(business.ownerId))
				.filter((value) => Number.isFinite(value)),
		),
	];

	const listingRows = ownerIds.length
		? await models.Listing.findAll({
				attributes: ["sellerId"],
				where: { sellerId: ownerIds },
			})
		: [];

	const listingCountByOwner = new Map();
	for (const row of listingRows) {
		const ownerId = Number(row.sellerId);
		listingCountByOwner.set(
			ownerId,
			(listingCountByOwner.get(ownerId) || 0) + 1,
		);
	}

	const normalized = businesses.rows.map((business) => ({
		...toBusinessPayload(business),
		name: business.owner?.name || "",
		email: business.owner?.email || null,
		avatar: business.businessLogo || "",
		ownerAvatar: business.owner?.avatar || "",
		listingCount: listingCountByOwner.get(Number(business.ownerId)) || 0,
	}));

	const ownersWithBusinessRows = new Set(
		businesses.rows.map((business) => Number(business.ownerId)),
	);

	const legacyUsers = await models.User.findAll({
		where: {
			accountType: "business",
			isActive: true,
		},
		attributes: [
			"id",
			"name",
			"email",
			"avatar",
			"businessBanner",
			"businessLatitude",
			"businessLongitude",
			"businessPlaceId",
			"businessLocationUrl",
			"location",
			"businessName",
			"gstOrMsme",
			"createdAt",
		],
		order: [["createdAt", "DESC"]],
	});

	for (const legacyUser of legacyUsers) {
		if (ownersWithBusinessRows.has(Number(legacyUser.id))) {
			continue;
		}

		normalized.push({
			...toLegacyBusinessPayload(legacyUser),
			listingCount: listingCountByOwner.get(Number(legacyUser.id)) || 0,
		});
	}

	res.json({
		businesses: normalized,
		total: normalized.length,
		page,
		pages: Math.max(Math.ceil(normalized.length / limit), 1),
	});
});

export const getMyBusinesses = asyncHandler(async (req, res) => {
	const rows = await models.Business.findAll({
		where: {
			ownerId: req.user.id,
			isActive: true,
		},
		order: [["createdAt", "DESC"]],
	});

	const businesses = rows.map(toBusinessPayload);

	if (!businesses.length) {
		const legacyUser = await models.User.findOne({
			where: {
				id: req.user.id,
				accountType: "business",
				isActive: true,
			},
			attributes: [
				"id",
				"name",
				"email",
				"avatar",
				"businessBanner",
				"businessLatitude",
				"businessLongitude",
				"businessPlaceId",
				"businessLocationUrl",
				"location",
				"businessName",
				"gstOrMsme",
				"createdAt",
			],
		});

		if (legacyUser) {
			businesses.push(toLegacyBusinessPayload(legacyUser));
		}
	}

	res.json({ businesses });
});

export const createBusiness = asyncHandler(async (req, res) => {
	const {
		businessName,
		description,
		gstOrMsme,
		category,
		additionalCategory,
		location,
		businessLatitude,
		businessLongitude,
		businessPlaceId,
		businessLocationUrl,
	} = req.body;

	if (!String(businessName || "").trim()) {
		return res.status(400).json({ message: "Business name is required" });
	}
	if (!String(description || "").trim()) {
		return res
			.status(400)
			.json({ message: "Business description is required" });
	}
	if (!String(gstOrMsme || "").trim()) {
		return res.status(400).json({ message: "GST/MSME is required" });
	}

	const normalizedGstin = normalizeGstin(gstOrMsme);
	const latitude = Number(businessLatitude);
	const longitude = Number(businessLongitude);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return res
			.status(400)
			.json({ message: "Exact business location is required" });
	}

	const logoFile = req.files?.businessLogo?.[0];
	if (!logoFile) {
		return res.status(400).json({ message: "Business logo is required" });
	}

	const logoUpload = await uploadToR2(logoFile, "dealpost/business-logos");
	let bannerUrl = "";
	const bannerFile = req.files?.businessBanner?.[0];
	if (bannerFile) {
		const bannerUpload = await uploadToR2(
			bannerFile,
			"dealpost/business-banners",
		);
		bannerUrl = bannerUpload.url;
	}

	const business = await models.Business.create({
		ownerId: req.user.id,
		businessName: String(businessName).trim(),
		description: String(description).trim(),
		gstOrMsme: normalizedGstin || String(gstOrMsme).trim(),
		category: String(category || "").trim(),
		additionalCategory: String(additionalCategory || "").trim(),
		location: String(location || "").trim(),
		businessLatitude: latitude,
		businessLongitude: longitude,
		businessPlaceId: String(businessPlaceId || "").trim() || null,
		businessLocationUrl: String(businessLocationUrl || "").trim(),
		businessLogo: logoUpload.url,
		businessBanner: bannerUrl,
	});

	if (String(req.user.accountType || "") !== "business") {
		req.user.accountType = "business";
		await req.user.save();
	}

	res.status(201).json({ business: toBusinessPayload(business) });
});

export const updateBusiness = asyncHandler(async (req, res) => {
	const businessId = Number(req.params.id);
	if (!Number.isFinite(businessId)) {
		return res.status(400).json({ message: "Invalid business id" });
	}

	const business = await models.Business.findOne({
		where: { id: businessId, ownerId: req.user.id, isActive: true },
	});

	if (!business) {
		return res.status(404).json({ message: "Business not found" });
	}

	const fields = [
		"businessName",
		"description",
		"gstOrMsme",
		"category",
		"additionalCategory",
		"location",
		"businessPlaceId",
		"businessLocationUrl",
	];
	for (const field of fields) {
		if (req.body[field] !== undefined) {
			business[field] = String(req.body[field] || "").trim();
		}
	}

	if (req.body.businessLatitude !== undefined) {
		const latitude = Number(req.body.businessLatitude);
		business.businessLatitude = Number.isFinite(latitude) ? latitude : null;
	}

	if (req.body.businessLongitude !== undefined) {
		const longitude = Number(req.body.businessLongitude);
		business.businessLongitude = Number.isFinite(longitude) ? longitude : null;
	}

	const logoFile = req.files?.businessLogo?.[0];
	if (logoFile) {
		const logoUpload = await uploadToR2(logoFile, "dealpost/business-logos");
		business.businessLogo = logoUpload.url;
	}

	const bannerFile = req.files?.businessBanner?.[0];
	if (bannerFile) {
		const bannerUpload = await uploadToR2(
			bannerFile,
			"dealpost/business-banners",
		);
		business.businessBanner = bannerUpload.url;
	}

	await business.save();

	res.json({ business: toBusinessPayload(business) });
});

export const deleteBusiness = asyncHandler(async (req, res) => {
	const businessId = Number(req.params.id);
	if (!Number.isFinite(businessId)) {
		return res.status(400).json({ message: "Invalid business id" });
	}

	const business = await models.Business.findOne({
		where: { id: businessId, ownerId: req.user.id, isActive: true },
	});

	if (!business) {
		return res.status(404).json({ message: "Business not found" });
	}

	business.isActive = false;
	await business.save();

	const activeCount = await models.Business.count({
		where: { ownerId: req.user.id, isActive: true },
	});

	if (activeCount === 0 && String(req.user.accountType || "") === "business") {
		req.user.accountType = "personal";
		await req.user.save();
	}

	res.json({ message: "Business removed" });
});
