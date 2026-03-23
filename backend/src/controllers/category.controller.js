import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

const DEFAULT_CATEGORIES = [
	"Electronics",
	"Fashion & Beauty",
	"Vehicles",
	"Property",
	"Sports",
	"Food & Drinks",
	"Health & Wellness",
	"Pet Supplies",
	"Services",
	"Home & Lifestyle",
];

// ---------------------------------------------------------------------------
// GET /api/categories  — returns all categories, auto-seeds if empty
// ---------------------------------------------------------------------------
export const getCategories = asyncHandler(async (req, res) => {
	let categories = await models.Category.findAll({
		order: [["name", "ASC"]],
	});

	// Auto-seed on first run if table is empty
	if (!categories.length) {
		const rows = DEFAULT_CATEGORIES.map((name) => ({
			name,
			slug: slugify(name),
		}));
		await models.Category.bulkCreate(rows, { ignoreDuplicates: true });
		categories = await models.Category.findAll({ order: [["name", "ASC"]] });
	}

	res.json({ categories });
});

// ---------------------------------------------------------------------------
// POST /api/categories  — admin only: create a new category
// ---------------------------------------------------------------------------
export const createCategory = asyncHandler(async (req, res) => {
	const { name, icon, color } = req.body;

	if (!name || String(name).trim().length < 2) {
		return res
			.status(400)
			.json({ message: "Category name must be at least 2 characters" });
	}

	const slug = slugify(name.trim());

	const [category, created] = await models.Category.findOrCreate({
		where: { slug },
		defaults: {
			name: name.trim(),
			slug,
			icon: icon || null,
			color: color || null,
		},
	});

	if (!created) {
		return res.status(400).json({ message: "Category already exists" });
	}

	res.status(201).json({ category });
});
