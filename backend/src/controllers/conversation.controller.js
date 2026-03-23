import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getMyConversations = asyncHandler(async (req, res) => {
	const conversations = await models.Conversation.findAll({
		where: {
			[Op.or]: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
		},
		include: [
			{
				model: models.Listing,
				as: "listing",
				attributes: ["id", "title", "images"],
			},
			{
				model: models.User,
				as: "buyer",
				attributes: ["id", "name", "avatar"],
			},
			{
				model: models.User,
				as: "seller",
				attributes: ["id", "name", "avatar"],
			},
			{
				model: models.Message,
				as: "messages",
				limit: 1,
				separate: true,
				order: [["createdAt", "DESC"]],
				include: [
					{
						model: models.User,
						as: "sender",
						attributes: ["id", "name", "avatar"],
					},
				],
			},
		],
		order: [["updatedAt", "DESC"]],
	});

	const normalized = conversations.map((conv) => {
		const json = conv.toJSON();
		json.lastMessage = json.messages?.[0] || null;
		return json;
	});

	res.json({ conversations: normalized });
});

export const startConversation = asyncHandler(async (req, res) => {
	const { recipientId, listingId } = req.body;

	if (!recipientId || !listingId) {
		return res
			.status(400)
			.json({ message: "recipientId and listingId are required" });
	}

	const buyerId = req.user.id;
	const sellerId = Number(recipientId);

	const [conversation] = await models.Conversation.findOrCreate({
		where: {
			buyerId,
			sellerId,
			listingId: Number(listingId),
		},
		defaults: {
			buyerId,
			sellerId,
			listingId: Number(listingId),
		},
	});

	res.json({ conversation });
});

export const getMessages = asyncHandler(async (req, res) => {
	const conversation = await models.Conversation.findByPk(req.params.id);

	if (!conversation) {
		return res.status(404).json({ message: "Conversation not found" });
	}

	const isParticipant =
		Number(conversation.buyerId) === Number(req.user.id) ||
		Number(conversation.sellerId) === Number(req.user.id);

	if (!isParticipant) {
		return res.status(403).json({ message: "Forbidden" });
	}

	const messages = await models.Message.findAll({
		where: { conversationId: conversation.id },
		include: [
			{
				model: models.User,
				as: "sender",
				attributes: ["id", "name", "avatar"],
			},
		],
		order: [["createdAt", "ASC"]],
	});

	res.json({ messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
	const conversation = await models.Conversation.findByPk(req.params.id);
	if (!conversation) {
		return res.status(404).json({ message: "Conversation not found" });
	}

	const isParticipant =
		Number(conversation.buyerId) === Number(req.user.id) ||
		Number(conversation.sellerId) === Number(req.user.id);

	if (!isParticipant) {
		return res.status(403).json({ message: "Forbidden" });
	}

	const { text } = req.body;
	if (!text) {
		return res.status(400).json({ message: "Message text is required" });
	}

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

	res.status(201).json({ message: populated });
});
