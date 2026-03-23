import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { encryptMessage, decryptMessage } from "../utils/encryption.js";

// ---------------------------------------------------------------------------
// POST /api/messages  — quick "contact seller" from ProductDetail page
// Creates/finds a conversation and sends the first message, encrypted.
// ---------------------------------------------------------------------------
export const quickMessage = asyncHandler(async (req, res) => {
	const { listingId, sellerId, text } = req.body;

	if (!listingId || !sellerId || !text) {
		return res
			.status(400)
			.json({ message: "listingId, sellerId, and text are required" });
	}

	if (!text.trim()) {
		return res.status(400).json({ message: "Message text cannot be empty" });
	}

	// Prevent messaging yourself
	if (Number(sellerId) === Number(req.user.id)) {
		return res
			.status(400)
			.json({ message: "You cannot message yourself" });
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

	// Encrypt before storing
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

	// Return decrypted text to the client
	const plain = typeof populated.toJSON === "function"
		? populated.toJSON()
		: { ...populated };
	plain.text = decryptMessage(plain.text);

	res.status(201).json({
		conversationId: conversation.id,
		message: plain,
	});
});
