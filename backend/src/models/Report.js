import { DataTypes } from "sequelize";

export function defineReport(sequelize) {
	return sequelize.define(
		"Report",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			listingId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			sellerId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			reporterId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			reason: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("pending", "reviewed", "dismissed"),
				defaultValue: "pending",
			},
		},
		{
			tableName: "reports",
		},
	);
}
