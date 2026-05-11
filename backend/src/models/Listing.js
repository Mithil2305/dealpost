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
			listingType: {
				type: DataTypes.ENUM("fixed", "auction"),
				allowNull: false,
				defaultValue: "fixed",
			},
			startingBid: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: true,
			},
			currentBid: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: true,
			},
			auctionEndsAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			auctionBids: {
				type: DataTypes.JSON,
				allowNull: false,
				defaultValue: [],
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
			imageDisplayMode: {
				type: DataTypes.ENUM("cover", "contain"),
				allowNull: false,
				defaultValue: "cover",
			},
			cropData: {
				type: DataTypes.JSON,
				defaultValue: [],
				comment:
					"Array of crop metadata for each image {useFullImage, crop, displayMode}",
			},
		},
		{
			tableName: "listings",
			indexes: [
				{ fields: ["product_id"], unique: true },
				{ fields: ["status", "created_at"] },
				{ fields: ["seller_id", "status"] },
				{ fields: ["listing_type", "auction_ends_at"] },
				{ fields: ["parent_category", "sub_category"] },
				{ fields: ["views"] },
			],
		},
	);
}
