import { DataTypes } from "sequelize";

export function defineListing(sequelize) {
	return sequelize.define(
		"Listing",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			productId: {
				type: DataTypes.STRING,
				allowNull: true,
				unique: true,
			},
			title: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			additionalNotes: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			parentCategory: {
				type: DataTypes.STRING,
			},
			subCategory: {
				type: DataTypes.STRING,
			},
			subtitle: {
				type: DataTypes.STRING,
			},
			price: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: false,
			},
			originalPrice: {
				type: DataTypes.DECIMAL(12, 2),
			},
			images: {
				type: DataTypes.JSON,
				defaultValue: [],
			},
			location: {
				type: DataTypes.JSON,
				defaultValue: {},
			},
			condition: {
				type: DataTypes.ENUM("New", "Like New", "Good", "Fair", "Poor"),
				defaultValue: "Good",
			},
			status: {
				type: DataTypes.ENUM("active", "sold", "pending", "removed"),
				defaultValue: "active",
			},
			views: {
				type: DataTypes.INTEGER.UNSIGNED,
				defaultValue: 0,
			},
			isFeatured: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
			premiumBoost: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
			specs: {
				type: DataTypes.JSON,
				defaultValue: {},
			},
		},
		{
			tableName: "listings",
		},
	);
}
