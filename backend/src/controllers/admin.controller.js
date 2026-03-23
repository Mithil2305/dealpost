import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const [usersTotal, usersThisMonth, activeAds, adsToday, pendingReports] =
		await Promise.all([
			models.User.count(),
			models.User.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
			models.Listing.count({ where: { status: "active" } }),
			models.Listing.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
			models.Report.count({ where: { status: "pending" } }),
		]);

	res.json({
		stats: {
			usersTotal,
			usersGrowth: `+${usersThisMonth} this month`,
			activeAds,
			activeAdsToday: `${adsToday} listed today`,
			pendingReports,
		},
	});
});

export const getReports = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, status = "pending" } = req.query;
	const numericPage = Number(page) || 1;
	const numericLimit = Number(limit) || 20;
	const offset = (numericPage - 1) * numericLimit;

	const { rows, count } = await models.Report.findAndCountAll({
		where: { status },
		include: [
			{
				model: models.Listing,
				as: "listing",
				attributes: ["id", "title", "images"],
			},
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.User,
				as: "reporter",
				attributes: ["id", "name"],
			},
		],
		order: [["createdAt", "DESC"]],
		offset,
		limit: numericLimit,
	});

	res.json({ reports: rows, total: count });
});

export const createReport = asyncHandler(async (req, res) => {
	const { listingId, reason } = req.body;

	if (!listingId || !reason) {
		return res
			.status(400)
			.json({ message: "listingId and reason are required" });
	}

	const listing = await models.Listing.findByPk(listingId);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	const report = await models.Report.create({
		listingId: listing.id,
		sellerId: listing.sellerId,
		reporterId: req.user.id,
		reason,
	});

	res.status(201).json({ report });
});

export const getAllUsers = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, search } = req.query;
	const numericPage = Number(page) || 1;
	const numericLimit = Number(limit) || 20;
	const offset = (numericPage - 1) * numericLimit;

	const where = {};
	if (search) {
		where[Op.or] = [
			{ name: { [Op.like]: `%${search}%` } },
			{ email: { [Op.like]: `%${search}%` } },
		];
	}

	const { rows, count } = await models.User.findAndCountAll({
		where,
		attributes: { exclude: ["password"] },
		order: [["createdAt", "DESC"]],
		offset,
		limit: numericLimit,
	});

	res.json({ users: rows, total: count });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
	const user = await models.User.findByPk(req.params.id);
	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	user.isActive = !user.isActive;
	await user.save();

	res.json({ user: user.toSafeObject() });
});

export const banUser = asyncHandler(async (req, res) => {
	const user = await models.User.findByPk(req.params.id);
	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	user.isActive = false;
	await user.save();

	res.json({ message: "User banned", user: user.toSafeObject() });
});

export const getAllListings = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, status } = req.query;
	const numericPage = Number(page) || 1;
	const numericLimit = Number(limit) || 20;
	const offset = (numericPage - 1) * numericLimit;

	const where = {};
	if (status) where.status = status;

	const { rows, count } = await models.Listing.findAndCountAll({
		where,
		include: [
			{ model: models.User, as: "seller", attributes: ["id", "name", "email"] },
			{ model: models.Category, as: "category", attributes: ["id", "name"] },
		],
		order: [["createdAt", "DESC"]],
		offset,
		limit: numericLimit,
	});

	res.json({ listings: rows, total: count });
});

export const updateListingStatus = asyncHandler(async (req, res) => {
	const { status } = req.body;
	const listing = await models.Listing.findByPk(req.params.id);

	if (!listing) {
		return res.status(404).json({ message: "Not found" });
	}

	listing.status = status;
	await listing.save();

	res.json({ listing });
});

export const adminDeleteListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);

	if (!listing) {
		return res.status(404).json({ message: "Not found" });
	}

	await listing.destroy();
	await models.Report.update(
		{ status: "dismissed" },
		{
			where: {
				listingId: req.params.id,
			},
		},
	);

	res.json({ message: "Listing removed and reports dismissed" });
});
