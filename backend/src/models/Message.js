import { DataTypes } from "sequelize";

export function defineMessage(sequelize) {
	return sequelize.define(
		"Message",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			conversationId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			senderId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			text: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			read: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
		},
		{
			tableName: "messages",
		},
	);
}
