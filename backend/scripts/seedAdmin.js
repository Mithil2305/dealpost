import { connectDB, models, sequelize } from "../src/config/db.js";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";

async function run() {
	try {
		if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
			throw new Error(
				"SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in env",
			);
		}

		await connectDB();

		const existing = await models.User.findOne({
			where: { email: ADMIN_EMAIL.toLowerCase() },
		});

		if (!existing) {
			await models.User.create({
				name: ADMIN_NAME,
				email: ADMIN_EMAIL.toLowerCase(),
				password: ADMIN_PASSWORD,
				role: "admin",
				isActive: true,
			});
			console.log("Admin user created");
		} else {
			console.log("Admin already exists, skipping.");
		}

		console.log(`Seed complete for ${ADMIN_EMAIL}`);
	} catch (error) {
		console.error("Failed to seed admin user", error);
		process.exitCode = 1;
	} finally {
		await sequelize.close();
	}
}

run();
