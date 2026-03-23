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

export const getCategories = asyncHandler(async (req, res) => {
	let categories = await models.Category.findAll({ order: [["name", "ASC"]] });

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

export const createCategory = asyncHandler(async (req, res) => {
	const { name, icon, color } = req.body;

	if (!name) {
		return res.status(400).json({ message: "Category name is required" });
	}

	const slug = slugify(name);
	const [category, created] = await models.Category.findOrCreate({
		where: { slug },
		defaults: {
			name,
			slug,
			icon,
			color,
		},
	});

	if (!created) {
		return res.status(400).json({ message: "Category already exists" });
	}

	res.status(201).json({ category });
});
