import { DataTypes } from "sequelize";

export function defineSponsoredAd(sequelize) {
	return sequelize.define(
		"SponsoredAd",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			title: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			imageUrl: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			targetUrl: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "/",
			},
			placement: {
				type: DataTypes.ENUM("left", "right", "any"),
				allowNull: false,
				defaultValue: "any",
			},
			status: {
				type: DataTypes.ENUM("pending", "approved", "rejected"),
				allowNull: false,
				defaultValue: "pending",
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			reviewNotes: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			approvedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			submittedById: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			reviewedById: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: true,
			},
		},
		{
			tableName: "sponsored_ads",
		},
	);
}
