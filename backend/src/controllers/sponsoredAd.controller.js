import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const GOOGLE_ADS_SNIPPET_KEY = "google_ads_snippet";
const ALLOWED_SNIPPET_PATTERN =
	/^(?:\s*|<script[^>]*src=["']https:\/\/pagead2\.googlesyndication\.com[^"']*["'][^>]*><\/script>\s*)$/i;

function normalizePlacement(value) {
	const next = String(value || "any").toLowerCase();
	return ["left", "right", "any"].includes(next) ? next : "any";
}

function normalizeStatus(value) {
	const next = String(value || "pending").toLowerCase();
	return ["pending", "approved", "rejected"].includes(next) ? next : "pending";
}

function toSponsoredAdPayload(ad) {
	if (!ad) return ad;
	const row = typeof ad.toJSON === "function" ? ad.toJSON() : ad;
	return {
		...row,
		id: row.id,
		submittedBy: row.submitter
			? {
					id: row.submitter.id,
					name: row.submitter.name,
					email: row.submitter.email,
				}
			: null,
		reviewedBy: row.reviewer
			? {
					id: row.reviewer.id,
					name: row.reviewer.name,
					email: row.reviewer.email,
				}
			: null,
	};
}

async function getSnippetValue() {
	const setting = await models.AppSetting.findOne({
		where: { key: GOOGLE_ADS_SNIPPET_KEY },
	});
	return setting?.value || "";
}

export const getPublicSponsoredAds = asyncHandler(async (req, res) => {
	const limit = Math.min(Number(req.query.limit) || 4, 20);
	const side = String(req.query.side || "").toLowerCase();
	const where = {
		status: "approved",
		isActive: true,
	};

	if (side === "left" || side === "right") {
		where.placement = {
			[Op.in]: [side, "any"],
		};
	}

	const ads = await models.SponsoredAd.findAll({
		where,
		order: [["updatedAt", "DESC"]],
		limit,
	});

	const googleAdsSnippet = await getSnippetValue();
	res.json({
		ads: ads.map(toSponsoredAdPayload),
		googleAdsSnippet,
	});
});

export const getMySponsoredAds = asyncHandler(async (req, res) => {
	const ads = await models.SponsoredAd.findAll({
		where: { submittedById: req.user.id },
		include: [
			{
				model: models.User,
				as: "submitter",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.User,
				as: "reviewer",
				attributes: ["id", "name", "email"],
			},
		],
		order: [["createdAt", "DESC"]],
	});

	res.json({ ads: ads.map(toSponsoredAdPayload) });
});

export const createSponsoredAd = asyncHandler(async (req, res) => {
	const title = String(req.body?.title || "").trim();
	const imageUrl = String(req.body?.imageUrl || "").trim();
	const description = String(req.body?.description || "").trim();
	const targetUrl = String(req.body?.targetUrl || "/").trim() || "/";
	const placement = normalizePlacement(req.body?.placement);

	if (title.length < 3) {
		return res.status(400).json({
			message: "Title must be at least 3 characters",
		});
	}

	if (!imageUrl) {
		return res.status(400).json({
			message: "Image URL is required",
		});
	}

	const ad = await models.SponsoredAd.create({
		title,
		description: description || null,
		imageUrl,
		targetUrl,
		placement,
		status: "pending",
		isActive: true,
		submittedById: req.user.id,
		reviewNotes: null,
		reviewedById: null,
		approvedAt: null,
	});

	res.status(201).json({ ad: toSponsoredAdPayload(ad) });
});

export const updateMySponsoredAd = asyncHandler(async (req, res) => {
	const ad = await models.SponsoredAd.findByPk(req.params.id);
	if (!ad) {
		return res.status(404).json({ message: "Sponsored ad not found" });
	}

	if (Number(ad.submittedById) !== Number(req.user.id)) {
		return res.status(403).json({ message: "Forbidden" });
	}

	const updates = {};
	if (req.body?.title !== undefined)
		updates.title = String(req.body.title).trim();
	if (req.body?.description !== undefined) {
		updates.description = String(req.body.description || "").trim() || null;
	}
	if (req.body?.imageUrl !== undefined) {
		updates.imageUrl = String(req.body.imageUrl || "").trim();
	}
	if (req.body?.targetUrl !== undefined) {
		updates.targetUrl = String(req.body.targetUrl || "/").trim() || "/";
	}
	if (req.body?.placement !== undefined) {
		updates.placement = normalizePlacement(req.body.placement);
	}
	if (req.body?.isActive !== undefined) {
		updates.isActive = Boolean(req.body.isActive);
	}

	if (updates.title !== undefined && updates.title.length < 3) {
		return res.status(400).json({
			message: "Title must be at least 3 characters",
		});
	}

	if (updates.imageUrl !== undefined && !updates.imageUrl) {
		return res.status(400).json({ message: "Image URL is required" });
	}

	const hasContentChanges =
		updates.title !== undefined ||
		updates.description !== undefined ||
		updates.imageUrl !== undefined ||
		updates.targetUrl !== undefined ||
		updates.placement !== undefined;

	Object.assign(ad, updates);
	if (hasContentChanges) {
		ad.status = "pending";
		ad.reviewNotes = null;
		ad.reviewedById = null;
		ad.approvedAt = null;
	}

	await ad.save();

	const hydrated = await models.SponsoredAd.findByPk(ad.id, {
		include: [
			{
				model: models.User,
				as: "submitter",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.User,
				as: "reviewer",
				attributes: ["id", "name", "email"],
			},
		],
	});

	res.json({ ad: toSponsoredAdPayload(hydrated) });
});

export const deleteMySponsoredAd = asyncHandler(async (req, res) => {
	const ad = await models.SponsoredAd.findByPk(req.params.id);
	if (!ad) {
		return res.status(404).json({ message: "Sponsored ad not found" });
	}

	if (Number(ad.submittedById) !== Number(req.user.id)) {
		return res.status(403).json({ message: "Forbidden" });
	}

	await ad.destroy();
	res.json({ message: "Sponsored ad deleted" });
});

export const getAdminSponsoredAds = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, status = "all", search = "" } = req.query;
	const numericPage = Math.max(Number(page) || 1, 1);
	const numericLimit = Math.min(Number(limit) || 20, 100);
	const offset = (numericPage - 1) * numericLimit;

	const where = {};
	if (String(status) !== "all") {
		where.status = normalizeStatus(status);
	}

	if (String(search).trim()) {
		where[Op.or] = [
			{ title: { [Op.like]: `%${String(search).trim()}%` } },
			{ targetUrl: { [Op.like]: `%${String(search).trim()}%` } },
		];
	}

	const { rows, count } = await models.SponsoredAd.findAndCountAll({
		where,
		include: [
			{
				model: models.User,
				as: "submitter",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.User,
				as: "reviewer",
				attributes: ["id", "name", "email"],
			},
		],
		order: [["createdAt", "DESC"]],
		offset,
		limit: numericLimit,
		distinct: true,
	});

	res.json({
		ads: rows.map(toSponsoredAdPayload),
		total: count,
		page: numericPage,
		pages: Math.max(Math.ceil(count / numericLimit), 1),
	});
});

export const createAdminSponsoredAd = asyncHandler(async (req, res) => {
	const title = String(req.body?.title || "").trim();
	const imageUrl = String(req.body?.imageUrl || "").trim();
	const description = String(req.body?.description || "").trim();
	const targetUrl = String(req.body?.targetUrl || "/").trim() || "/";
	const placement = normalizePlacement(req.body?.placement);
	const status = normalizeStatus(req.body?.status || "approved");
	const isActive =
		req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;
	const reviewNotes = String(req.body?.reviewNotes || "").trim();

	if (title.length < 3) {
		return res
			.status(400)
			.json({ message: "Title must be at least 3 characters" });
	}
	if (!imageUrl) {
		return res.status(400).json({ message: "Image URL is required" });
	}

	const ad = await models.SponsoredAd.create({
		title,
		description: description || null,
		imageUrl,
		targetUrl,
		placement,
		status,
		isActive,
		reviewNotes: reviewNotes || null,
		submittedById: req.user.id,
		reviewedById: req.user.id,
		approvedAt: status === "approved" ? new Date() : null,
	});

	const hydrated = await models.SponsoredAd.findByPk(ad.id, {
		include: [
			{
				model: models.User,
				as: "submitter",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.User,
				as: "reviewer",
				attributes: ["id", "name", "email"],
			},
		],
	});

	res.status(201).json({ ad: toSponsoredAdPayload(hydrated) });
});

export const updateAdminSponsoredAd = asyncHandler(async (req, res) => {
	const ad = await models.SponsoredAd.findByPk(req.params.id);
	if (!ad) {
		return res.status(404).json({ message: "Sponsored ad not found" });
	}

	if (req.body?.title !== undefined)
		ad.title = String(req.body.title || "").trim();
	if (req.body?.description !== undefined) {
		ad.description = String(req.body.description || "").trim() || null;
	}
	if (req.body?.imageUrl !== undefined)
		ad.imageUrl = String(req.body.imageUrl || "").trim();
	if (req.body?.targetUrl !== undefined) {
		ad.targetUrl = String(req.body.targetUrl || "/").trim() || "/";
	}
	if (req.body?.placement !== undefined) {
		ad.placement = normalizePlacement(req.body.placement);
	}
	if (req.body?.status !== undefined) {
		ad.status = normalizeStatus(req.body.status);
		ad.reviewedById = req.user.id;
		ad.approvedAt = ad.status === "approved" ? new Date() : null;
	}
	if (req.body?.isActive !== undefined) {
		ad.isActive = Boolean(req.body.isActive);
	}
	if (req.body?.reviewNotes !== undefined) {
		ad.reviewNotes = String(req.body.reviewNotes || "").trim() || null;
	}

	if (!ad.title || ad.title.length < 3) {
		return res
			.status(400)
			.json({ message: "Title must be at least 3 characters" });
	}
	if (!ad.imageUrl) {
		return res.status(400).json({ message: "Image URL is required" });
	}

	await ad.save();
	const hydrated = await models.SponsoredAd.findByPk(ad.id, {
		include: [
			{
				model: models.User,
				as: "submitter",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.User,
				as: "reviewer",
				attributes: ["id", "name", "email"],
			},
		],
	});
	res.json({ ad: toSponsoredAdPayload(hydrated) });
});

export const deleteAdminSponsoredAd = asyncHandler(async (req, res) => {
	const ad = await models.SponsoredAd.findByPk(req.params.id);
	if (!ad) {
		return res.status(404).json({ message: "Sponsored ad not found" });
	}

	await ad.destroy();
	res.json({ message: "Sponsored ad deleted" });
});

export const getAdminGoogleAdsSnippet = asyncHandler(async (_req, res) => {
	const googleAdsSnippet = await getSnippetValue();
	res.json({ googleAdsSnippet });
});

export const upsertAdminGoogleAdsSnippet = asyncHandler(async (req, res) => {
	const snippet = String(req.body?.googleAdsSnippet || "").trim();

	if (snippet && !ALLOWED_SNIPPET_PATTERN.test(snippet)) {
		return res
			.status(400)
			.json({ message: "Invalid Google Ads snippet format" });
	}

	const existing = await models.AppSetting.findOne({
		where: { key: GOOGLE_ADS_SNIPPET_KEY },
	});

	if (existing) {
		existing.value = snippet;
		await existing.save();
	} else {
		await models.AppSetting.create({
			key: GOOGLE_ADS_SNIPPET_KEY,
			value: snippet,
		});
	}

	res.json({ googleAdsSnippet: snippet });
});
