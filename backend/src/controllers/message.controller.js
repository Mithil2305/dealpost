import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const quickMessage = asyncHandler(async (req, res) => {
	const { listingId, sellerId, text } = req.body;

	if (!listingId || !sellerId || !text) {
		return res
			.status(400)
			.json({ message: "listingId, sellerId, and text are required" });
	}

	const [conversation] = await models.Conversation.findOrCreate({
		where: {
			buyerId: req.user.id,
			sellerId: Number(sellerId),
			listingId: Number(listingId),
		},
		defaults: {
			buyerId: req.user.id,
			sellerId: Number(sellerId),
			listingId: Number(listingId),
		},
	});

	const message = await models.Message.create({
		conversationId: conversation.id,
		senderId: req.user.id,
		text,
	});

	conversation.lastMessageId = message.id;
	await conversation.save();

	const populated = await models.Message.findByPk(message.id, {
		include: [
			{
				model: models.User,
				as: "sender",
				attributes: ["id", "name", "avatar"],
			},
		],
	});

	res.status(201).json({
		conversationId: conversation.id,
		message: populated,
	});
});
