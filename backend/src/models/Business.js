import { DataTypes } from "sequelize";

export function defineBusiness(sequelize) {
	return sequelize.define(
		"Business",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			ownerId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			businessName: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: false,
				defaultValue: "",
			},
			gstOrMsme: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			category: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "",
			},
			additionalCategory: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "",
			},
			location: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "",
			},
			businessLatitude: {
				type: DataTypes.DECIMAL(10, 7),
				allowNull: true,
			},
			businessLongitude: {
				type: DataTypes.DECIMAL(10, 7),
				allowNull: true,
			},
			businessPlaceId: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			businessLocationUrl: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "",
			},
			businessLogo: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "",
			},
			businessBanner: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "",
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
		},
		{
			tableName: "businesses",
		},
	);
}
