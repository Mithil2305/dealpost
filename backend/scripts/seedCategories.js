import { connectDB, models, sequelize } from "../src/config/db.js";
import { DEFAULT_CATEGORIES } from "../src/constants/defaultCategories.js";
import { slugify } from "../src/utils/slugify.js";

async function run() {
	try {
		await connectDB();

		for (const name of DEFAULT_CATEGORIES) {
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
