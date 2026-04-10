import { Op } from "sequelize";
import { connectDB, models, sequelize } from "../src/config/db.js";

const USERS_TABLE = "users";

function normalizeTableName(tableLike) {
	if (typeof tableLike === "string") return tableLike;
	if (tableLike?.tableName) return tableLike.tableName;
	if (tableLike?.table_name) return tableLike.table_name;
	return "";
}

function quoteIdentifier(name) {
	return `\`${String(name).replace(/`/g, "``")}\``;
}

async function run() {
	const force = String(process.env.CLEAN_DB_FORCE || "")
		.trim()
		.toLowerCase();

	if (force !== "true") {
		throw new Error(
			"Refusing to clean DB without CLEAN_DB_FORCE=true. This operation is destructive.",
		);
	}

	await connectDB();

	const adminCount = await models.User.count({ where: { role: "admin" } });
	if (adminCount === 0) {
		throw new Error(
			"No admin user found. Aborting cleanup to avoid deleting all credentials.",
		);
	}

	const queryInterface = sequelize.getQueryInterface();
	const rawTables = await queryInterface.showAllTables();
	const tableNames = rawTables
		.map(normalizeTableName)
		.filter(Boolean)
		.filter((table) => table !== USERS_TABLE);

	await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
	for (const table of tableNames) {
		await sequelize.query(`TRUNCATE TABLE ${quoteIdentifier(table)}`);
	}

	const removedUsers = await models.User.destroy({
		where: {
			role: { [Op.ne]: "admin" },
		},
	});

	await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

	console.log(
		`DB cleaned. Truncated ${tableNames.length} tables and removed ${removedUsers} non-admin users.`,
	);
	console.log(`Admin users preserved: ${adminCount}`);
}

run()
	.catch((error) => {
		console.error(
			"Failed to clean DB while preserving admin credentials",
			error,
		);
		process.exitCode = 1;
	})
	.finally(async () => {
		await sequelize.close();
	});
