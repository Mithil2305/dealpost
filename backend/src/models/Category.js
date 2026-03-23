import { DataTypes } from "sequelize";

export function defineCategory(sequelize) {
	return sequelize.define(
		"Category",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			slug: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			icon: {
				type: DataTypes.STRING,
			},
			color: {
				type: DataTypes.STRING,
			},
		},
		{
			tableName: "categories",
		},
	);
}
