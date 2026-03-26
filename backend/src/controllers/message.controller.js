import { models } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { encryptMessage, decryptMessage } from "../utils/encryption.js";

const MAX_MESSAGE_LENGTH = 2000;

// ---------------------------------------------------------------------------
// POST /api/messages  — quick "contact seller" from ProductDetail page
// Creates/finds a conversation and sends the first message, encrypted.
// ---------------------------------------------------------------------------
export const quickMessage = asyncHandler(async (req, res) => {
	const { listingId, sellerId, text } = req.body;

	if (!listingId || !text) {
		return res.status(400).json({ message: "listingId and text are required" });
	}

	if (!text.trim()) {
		return res.status(400).json({ message: "Message text cannot be empty" });
	}

	if (String(text).trim().length > MAX_MESSAGE_LENGTH) {
		return res.status(400).json({
			message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
		});
	}

	const numericListingId = Number(listingId);
	if (!Number.isFinite(numericListingId) || numericListingId <= 0) {
		return res.status(400).json({ message: "Invalid listingId" });
	}

	const listing = await models.Listing.findByPk(numericListingId, {
		attributes: ["id", "sellerId"],
	});

	if (!listing) {
		return res.status(404).json({ message: "Listing not found" });
	}

	const resolvedSellerId = Number(sellerId) || Number(listing.sellerId);
	if (!Number.isFinite(resolvedSellerId) || resolvedSellerId <= 0) {
		return res
			.status(400)
			.json({ message: "Seller information is unavailable for this listing" });
	}

	// Prevent messaging yourself
	if (resolvedSellerId === Number(req.user.id)) {
		return res.status(400).json({ message: "You cannot message yourself" });
	}

	const [conversation] = await models.Conversation.findOrCreate({
		where: {
			buyerId: req.user.id,
			sellerId: resolvedSellerId,
			listingId: numericListingId,
		},
		defaults: {
			buyerId: req.user.id,
			sellerId: resolvedSellerId,
			listingId: numericListingId,
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
	const plain =
		typeof populated.toJSON === "function"
			? populated.toJSON()
			: { ...populated };
	plain.text = decryptMessage(plain.text);

	res.status(201).json({
		conversationId: conversation.id,
		message: plain,
	});
});
