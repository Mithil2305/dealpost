import { DataTypes } from "sequelize";

export function defineAppSetting(sequelize) {
	return sequelize.define(
		"AppSetting",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			key: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			value: {
				type: DataTypes.TEXT("long"),
				allowNull: true,
			},
		},
		{
			tableName: "app_settings",
		},
	);
}
