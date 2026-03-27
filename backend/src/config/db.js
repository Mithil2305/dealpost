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
		pool: {
			max: 10,
			min: 2,
			acquire: 30000,
			idle: 10000,
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

async function ensureListingIdentityColumns() {
	const queryInterface = sequelize.getQueryInterface();
	const columns = await queryInterface.describeTable("listings");

	if (!columns.product_id && !columns.productId) {
		await queryInterface.addColumn("listings", "product_id", {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true,
		});
	}

	if (!columns.additional_notes && !columns.additionalNotes) {
		await queryInterface.addColumn("listings", "additional_notes", {
			type: DataTypes.TEXT,
			allowNull: true,
		});
	}

	await sequelize.query(
		"UPDATE listings SET product_id = COALESCE(product_id, CONCAT('DP-', LPAD(id, 8, '0'))) WHERE (product_id IS NULL OR product_id = '')",
	);
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

	if (!columns.liked_listing_ids && !columns.likedListingIds) {
		await queryInterface.addColumn("users", "liked_listing_ids", {
			type: DataTypes.JSON,
			allowNull: false,
			defaultValue: [],
		});
	}
}

export async function connectDB() {
	await sequelize.authenticate();
	await sequelize.sync();

	// These legacy schema guards are intentionally skipped in production.
	// Use explicit migrations for production-safe schema evolution.
	if (process.env.NODE_ENV !== "production") {
		await ensureListingCategoryColumns();
		await ensureListingIdentityColumns();
		await ensureUserBusinessColumns();
	}
	console.log("MySQL connected and models synced");
}
