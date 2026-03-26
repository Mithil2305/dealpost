import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

// ---------------------------------------------------------------------------
// GET /api/admin/stats
// ---------------------------------------------------------------------------
export const getDashboardStats = asyncHandler(async (req, res) => {
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const [usersTotal, usersThisMonth, activeAds, adsToday, pendingReports] =
		await Promise.all([
			models.User.count(),
			models.User.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
			models.Listing.count({ where: { status: "active" } }),
			models.Listing.count({
				where: { createdAt: { [Op.gte]: todayStart } },
			}),
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

// ---------------------------------------------------------------------------
// GET /api/admin/reports
// ---------------------------------------------------------------------------
export const getReports = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, status = "pending" } = req.query;
	const numericPage = Math.max(Number(page) || 1, 1);
	const numericLimit = Math.min(Number(limit) || 20, 100);
	const offset = (numericPage - 1) * numericLimit;
	const validStatuses = ["pending", "reviewed", "dismissed", "all"];

	if (!validStatuses.includes(String(status))) {
		return res.status(400).json({
			message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
		});
	}

	const where = {};
	if (status !== "all") {
		where.status = status;
	}

	const { rows, count } = await models.Report.findAndCountAll({
		where,
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
		distinct: true,
	});

	res.json({ reports: rows, total: count });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/reports/:id/status
// ---------------------------------------------------------------------------
export const updateReportStatus = asyncHandler(async (req, res) => {
	const { status } = req.body;
	const validStatuses = ["pending", "reviewed", "dismissed"];

	if (!validStatuses.includes(String(status))) {
		return res.status(400).json({
			message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
		});
	}

	const report = await models.Report.findByPk(req.params.id);
	if (!report) {
		return res.status(404).json({ message: "Report not found" });
	}

	report.status = status;
	await report.save();

	res.json({ report });
});

// ---------------------------------------------------------------------------
// POST /api/admin/reports  — any authenticated user can file a report
// ---------------------------------------------------------------------------
export const createReport = asyncHandler(async (req, res) => {
	const { listingId, reason } = req.body;

	if (!listingId || !reason) {
		return res
			.status(400)
			.json({ message: "listingId and reason are required" });
	}

	if (String(reason).trim().length < 5) {
		return res
			.status(400)
			.json({ message: "Please provide a more detailed reason" });
	}

	const listing = await models.Listing.findByPk(listingId);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	// Prevent reporting own listing
	if (Number(listing.sellerId) === Number(req.user.id)) {
		return res
			.status(400)
			.json({ message: "You cannot report your own listing" });
	}

	const report = await models.Report.create({
		listingId: listing.id,
		sellerId: listing.sellerId,
		reporterId: req.user.id,
		reason: String(reason).trim(),
	});

	res.status(201).json({ report });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------
export const getAllUsers = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, search } = req.query;
	const numericPage = Math.max(Number(page) || 1, 1);
	const numericLimit = Math.min(Number(limit) || 20, 100);
	const offset = (numericPage - 1) * numericLimit;

	const where = {};
	const searchTerm = String(search || "")
		.trim()
		.slice(0, 200);
	if (searchTerm) {
		where[Op.or] = [
			{ name: { [Op.like]: `%${searchTerm}%` } },
			{ email: { [Op.like]: `%${searchTerm}%` } },
		];
	}

	const { rows, count } = await models.User.findAndCountAll({
		where,
		attributes: { exclude: ["password"] },
		order: [["createdAt", "DESC"]],
		offset,
		limit: numericLimit,
		distinct: true,
	});

	res.json({ users: rows, total: count });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/status  — toggle isActive
// ---------------------------------------------------------------------------
export const toggleUserStatus = asyncHandler(async (req, res) => {
	const user = await models.User.findByPk(req.params.id);
	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	// Prevent admins from banning themselves
	if (Number(req.params.id) === Number(req.user.id)) {
		return res
			.status(400)
			.json({ message: "You cannot change your own status" });
	}

	user.isActive = !user.isActive;
	await user.save();

	res.json({ user: user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/ban  — hard ban (set isActive = false)
// ---------------------------------------------------------------------------
export const banUser = asyncHandler(async (req, res) => {
	const user = await models.User.findByPk(req.params.id);
	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	if (Number(req.params.id) === Number(req.user.id)) {
		return res.status(400).json({ message: "You cannot ban yourself" });
	}

	user.isActive = false;
	await user.save();

	res.json({ message: "User banned", user: user.toSafeObject() });
});

// ---------------------------------------------------------------------------
// GET /api/admin/listings
// ---------------------------------------------------------------------------
export const getAllListings = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, status, search } = req.query;
	const numericPage = Math.max(Number(page) || 1, 1);
	const numericLimit = Math.min(Number(limit) || 20, 100);
	const offset = (numericPage - 1) * numericLimit;

	const where = {};
	if (status) where.status = status;
	if (search && String(search).trim()) {
		const query = String(search).trim();
		where[Op.or] = [
			{ title: { [Op.like]: `%${query}%` } },
			{ productId: { [Op.like]: `%${query}%` } },
		];
	}

	const { rows, count } = await models.Listing.findAndCountAll({
		where,
		include: [
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "email"],
			},
			{
				model: models.Category,
				as: "category",
				attributes: ["id", "name"],
			},
		],
		order: [["createdAt", "DESC"]],
		offset,
		limit: numericLimit,
		distinct: true,
	});

	res.json({ listings: rows, total: count });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/listings/:id/status
// ---------------------------------------------------------------------------
export const updateListingStatus = asyncHandler(async (req, res) => {
	const { status } = req.body;
	const validStatuses = ["active", "sold", "pending", "removed"];

	if (!validStatuses.includes(status)) {
		return res.status(400).json({
			message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
		});
	}

	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	listing.status = status;
	await listing.save();

	res.json({ listing });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/listings/:id  — remove listing and dismiss related reports
// ---------------------------------------------------------------------------
export const adminDeleteListing = asyncHandler(async (req, res) => {
	const listing = await models.Listing.findByPk(req.params.id);
	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	await listing.destroy();

	// Dismiss all pending reports for this listing
	await models.Report.update(
		{ status: "dismissed" },
		{ where: { listingId: req.params.id } },
	);

	res.json({ message: "Listing removed and reports dismissed" });
});

// ---------------------------------------------------------------------------
// GET /api/admin/categories
// ---------------------------------------------------------------------------
export const getAllCategories = asyncHandler(async (req, res) => {
	const categories = await models.Category.findAll({
		order: [["name", "ASC"]],
	});

	res.json({ categories, total: categories.length });
});

// ---------------------------------------------------------------------------
// POST /api/admin/categories
// ---------------------------------------------------------------------------
export const createAdminCategory = asyncHandler(async (req, res) => {
	const { name, icon, color } = req.body;

	if (!name || String(name).trim().length < 2) {
		return res
			.status(400)
			.json({ message: "Category name must be at least 2 characters" });
	}

	const safeName = String(name).trim();
	const slug = slugify(safeName);

	if (!slug) {
		return res.status(400).json({ message: "Invalid category name" });
	}

	const existing = await models.Category.findOne({ where: { slug } });
	if (existing) {
		return res.status(400).json({ message: "Category already exists" });
	}

	const category = await models.Category.create({
		name: safeName,
		slug,
		icon: icon || null,
		color: color || null,
	});

	res.status(201).json({ category });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/categories/:id
// ---------------------------------------------------------------------------
export const updateAdminCategory = asyncHandler(async (req, res) => {
	const category = await models.Category.findByPk(req.params.id);
	if (!category) {
		return res.status(404).json({ message: "Category not found" });
	}

	const { name, icon, color } = req.body;
	if (name !== undefined) {
		const nextName = String(name).trim();
		if (nextName.length < 2) {
			return res
				.status(400)
				.json({ message: "Category name must be at least 2 characters" });
		}

		const nextSlug = slugify(nextName);
		const existingWithSlug = await models.Category.findOne({
			where: {
				slug: nextSlug,
				id: { [Op.ne]: category.id },
			},
		});

		if (existingWithSlug) {
			return res.status(400).json({ message: "Category already exists" });
		}

		category.name = nextName;
		category.slug = nextSlug;
	}

	if (icon !== undefined) category.icon = icon || null;
	if (color !== undefined) category.color = color || null;

	await category.save();

	res.json({ category });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/categories/:id
// ---------------------------------------------------------------------------
export const deleteAdminCategory = asyncHandler(async (req, res) => {
	const category = await models.Category.findByPk(req.params.id);
	if (!category) {
		return res.status(404).json({ message: "Category not found" });
	}

	const linkedListings = await models.Listing.count({
		where: { categoryId: category.id },
	});

	if (linkedListings > 0) {
		return res.status(400).json({
			message: "Cannot delete category with active linked listings",
		});
	}

	await category.destroy();
	res.json({ message: "Category deleted" });
});
