import { Op } from "sequelize";
import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { encryptMessage, decryptMessage } from "../utils/encryption.js";

const MAX_MESSAGE_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Helper: decrypt a message row and return a plain object with text decrypted
// ---------------------------------------------------------------------------
function decryptMessageRow(msg) {
	const plain = typeof msg.toJSON === "function" ? msg.toJSON() : { ...msg };
	plain.text = decryptMessage(plain.text);
	return plain;
}

// ---------------------------------------------------------------------------
// GET /api/conversations  — list all conversations for the current user
// ---------------------------------------------------------------------------
export const getMyConversations = asyncHandler(async (req, res) => {
	const limit = Math.min(Number(req.query.limit) || 50, 50);
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
		limit,
	});

	const normalized = conversations.map((conv) => {
		const json = conv.toJSON();
		// Decrypt the last message preview
		if (json.messages?.[0]) {
			json.messages[0] = decryptMessageRow(json.messages[0]);
		}
		json.lastMessage = json.messages?.[0] || null;
		return json;
	});

	res.json({ conversations: normalized });
});

// ---------------------------------------------------------------------------
// POST /api/conversations  — start or retrieve an existing conversation
// ---------------------------------------------------------------------------
export const startConversation = asyncHandler(async (req, res) => {
	const { recipientId, listingId } = req.body;

	if (!recipientId || !listingId) {
		return res
			.status(400)
			.json({ message: "recipientId and listingId are required" });
	}

	const buyerId = req.user.id;
	const sellerId = Number(recipientId);
	const listing = await models.Listing.findByPk(Number(listingId), {
		attributes: ["id", "sellerId"],
	});

	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	if (Number(listing.sellerId) !== sellerId) {
		return res
			.status(400)
			.json({ message: "Recipient is not the seller of this listing" });
	}

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

// ---------------------------------------------------------------------------
// GET /api/conversations/:id/messages  — fetch all messages (decrypted)
// ---------------------------------------------------------------------------
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
		order: [["createdAt", "DESC"]],
		limit: Math.min(Number(req.query.limit) || 50, 100),
		offset:
			(Math.max(Number(req.query.page) || 1, 1) - 1) *
			Math.min(Number(req.query.limit) || 50, 100),
	});

	// Decrypt every message before sending to client
	const decrypted = messages.map(decryptMessageRow).reverse();

	res.json({ messages: decrypted });
});

// ---------------------------------------------------------------------------
// POST /api/conversations/:id/messages  — send a message (encrypted at rest)
// ---------------------------------------------------------------------------
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
	if (!text || !text.trim()) {
		return res.status(400).json({ message: "Message text is required" });
	}

	if (String(text).trim().length > MAX_MESSAGE_LENGTH) {
		return res.status(400).json({
			message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
		});
	}

	// Encrypt before writing to DB
	const encryptedText = encryptMessage(text.trim());

	const message = await models.Message.create({
		conversationId: conversation.id,
		senderId: req.user.id,
		text: encryptedText,
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

	// Return decrypted text to the sender
	const responseMsg = decryptMessageRow(populated);

	res.status(201).json({ message: responseMsg });
});
