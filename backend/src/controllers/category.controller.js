import { models } from "../config/db.js";
import { DEFAULT_CATEGORIES } from "../constants/defaultCategories.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

// ---------------------------------------------------------------------------
// GET /api/categories  — returns all categories, auto-seeds if empty
// ---------------------------------------------------------------------------
export const getCategories = asyncHandler(async (req, res) => {
	const rows = DEFAULT_CATEGORIES.map((name) => ({
		name,
		slug: slugify(name),
	}));

	// Keep baseline categories in sync even for existing databases.
	await models.Category.bulkCreate(rows, { ignoreDuplicates: true });

	const sortOrder = new Map(
		DEFAULT_CATEGORIES.map((name, index) => [name, index]),
	);
	const categories = await models.Category.findAll();
	categories.sort((a, b) => {
		const aRank = sortOrder.has(a.name)
			? sortOrder.get(a.name)
			: Number.MAX_SAFE_INTEGER;
		const bRank = sortOrder.has(b.name)
			? sortOrder.get(b.name)
			: Number.MAX_SAFE_INTEGER;
		if (aRank !== bRank) return aRank - bRank;
		return String(a.name || "").localeCompare(String(b.name || ""));
	});

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
