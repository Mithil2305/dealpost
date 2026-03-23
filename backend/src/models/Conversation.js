import { DataTypes } from "sequelize";

export function defineConversation(sequelize) {
	return sequelize.define(
		"Conversation",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			buyerId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			sellerId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			listingId: {
				type: DataTypes.INTEGER.UNSIGNED,
				allowNull: false,
			},
			lastMessageId: {
				type: DataTypes.INTEGER.UNSIGNED,
			},
		},
		{
			tableName: "conversations",
			indexes: [
				{
					unique: true,
					fields: ["buyer_id", "seller_id", "listing_id"],
				},
			],
		},
	);
}
