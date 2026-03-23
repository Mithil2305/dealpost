import { connectDB, models, sequelize } from "../src/config/db.js";
import { slugify } from "../src/utils/slugify.js";

const categories = [
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

async function run() {
	try {
		await connectDB();

		for (const name of categories) {
			await models.Category.findOrCreate({
				where: { slug: slugify(name) },
				defaults: {
					name,
					slug: slugify(name),
				},
			});
		}

		console.log("Categories seeded");
	} catch (error) {
		console.error("Failed to seed categories", error);
		process.exitCode = 1;
	} finally {
		await sequelize.close();
	}
}

run();
