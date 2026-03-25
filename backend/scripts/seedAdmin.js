import { connectDB, models, sequelize } from "../src/config/db.js";

const ADMIN_EMAIL = "admin@123";
const ADMIN_PASSWORD = "123456";
const ADMIN_NAME = "Admin";

async function run() {
	try {
		await connectDB();

		const existing = await models.User.findOne({
			where: { email: ADMIN_EMAIL.toLowerCase() },
		});

		if (!existing) {
			await models.User.create({
				name: ADMIN_NAME,
				email: ADMIN_EMAIL,
				password: ADMIN_PASSWORD,
				role: "admin",
				isActive: true,
			});
			console.log("Admin user created");
		} else {
			existing.name = existing.name || ADMIN_NAME;
			existing.password = ADMIN_PASSWORD;
			existing.role = "admin";
			existing.isActive = true;
			await existing.save();
			console.log("Admin user updated");
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
