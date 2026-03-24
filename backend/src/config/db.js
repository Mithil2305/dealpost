import { DataTypes, Sequelize } from "sequelize";
import { env } from "./env.js";
import { initModels } from "../models/index.js";

export const sequelize = new Sequelize(
	env.DB_NAME,
	env.DB_USER,
	env.DB_PASSWORD,
	{
		host: env.DB_HOST,
		port: env.DB_PORT,
		dialect: "mysql",
		logging: false,
		define: {
			underscored: true,
		},
	},
);

export const models = initModels(sequelize);

async function ensureListingCategoryColumns() {
	const queryInterface = sequelize.getQueryInterface();
	const columns = await queryInterface.describeTable("listings");

	const hasParentSnake = Boolean(columns.parent_category);
	const hasParentCamel = Boolean(columns.parentCategory);
	const hasSubSnake = Boolean(columns.sub_category);
	const hasSubCamel = Boolean(columns.subCategory);

	if (!hasParentSnake) {
		await queryInterface.addColumn("listings", "parent_category", {
			type: DataTypes.STRING,
			allowNull: true,
		});
	}

	if (!hasSubSnake) {
		await queryInterface.addColumn("listings", "sub_category", {
			type: DataTypes.STRING,
			allowNull: true,
		});
	}

	// Backfill snake_case columns from previous camelCase columns if they exist.
	if (hasParentCamel) {
		await sequelize.query(
			"UPDATE listings SET parent_category = COALESCE(parent_category, parentCategory)",
		);
	}

	if (hasSubCamel) {
		await sequelize.query(
			"UPDATE listings SET sub_category = COALESCE(sub_category, subCategory)",
		);
	}
}

async function ensureUserBusinessColumns() {
	const queryInterface = sequelize.getQueryInterface();
	const columns = await queryInterface.describeTable("users");

	if (!columns.account_type && !columns.accountType) {
		await queryInterface.addColumn("users", "account_type", {
			type: DataTypes.ENUM("personal", "business"),
			allowNull: false,
			defaultValue: "personal",
		});
	}

	if (!columns.business_name && !columns.businessName) {
		await queryInterface.addColumn("users", "business_name", {
			type: DataTypes.STRING,
			allowNull: true,
		});
	}

	if (!columns.gst_or_msme && !columns.gstOrMsme) {
		await queryInterface.addColumn("users", "gst_or_msme", {
			type: DataTypes.STRING,
			allowNull: true,
		});
	}
}

export async function connectDB() {
	await sequelize.authenticate();
	await sequelize.sync();
	await ensureListingCategoryColumns();
	await ensureUserBusinessColumns();
	console.log("MySQL connected and models synced");
}
