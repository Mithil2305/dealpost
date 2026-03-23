import { encryptMessage, decryptMessage } from "../utils/encryption.js";

/**
 * Socket.IO real-time chat handler.
 *
 * Security model:
 * - Messages sent over sockets are relayed as plaintext between connected
 *   clients in the same conversation room (in-transit TLS handles transport
 *   security via HTTPS/WSS in production).
 * - Persistence is handled by the REST API which encrypts at rest.
 * - The socket layer does NOT write to the database — it only relays events
 *   for real-time UX. Clients call POST /api/conversations/:id/messages to
 *   persist (which encrypts), then emit via socket for instant delivery.
 *
 * Flow:
 *   1. Client sends POST /api/conversations/:id/messages → DB stores encrypted
 *   2. Client emits "send_message" via socket with the decrypted message obj
 *   3. Socket relays to other room participants in real-time
 *   4. Recipient sees message immediately; also available via REST on reload
 */
export function registerSocketHandlers(io) {
	// Track connected users: userId → socketId
	const connectedUsers = new Map();

	io.on("connection", (socket) => {
		const userId = socket.handshake.auth?.userId;
		if (userId) {
			connectedUsers.set(String(userId), socket.id);
		}

		// Join a conversation room
		socket.on("join_conversation", (conversationId) => {
			socket.join(String(conversationId));
		});

		// Leave a conversation room
		socket.on("leave_conversation", (conversationId) => {
			socket.leave(String(conversationId));
		});

		/**
		 * Relay a message to other participants.
		 * The `message` object should be the decrypted message returned
		 * by POST /api/conversations/:id/messages.
		 * We do NOT re-encrypt here — TLS handles transport security.
		 */
		socket.on("send_message", ({ conversationId, message }) => {
			socket
				.to(String(conversationId))
				.emit("receive_message", message);
		});

		// Typing indicator
		socket.on("typing", ({ conversationId, userId: typingUserId, userName }) => {
			socket.to(String(conversationId)).emit("user_typing", {
				userId: typingUserId,
				userName,
			});
		});

		// Stop typing indicator
		socket.on("stop_typing", ({ conversationId, userId: typingUserId }) => {
			socket.to(String(conversationId)).emit("user_stop_typing", {
				userId: typingUserId,
			});
		});

		// Mark messages as read
		socket.on("mark_read", ({ conversationId, userId: readerId }) => {
			socket.to(String(conversationId)).emit("messages_read", {
				conversationId,
				readerId,
			});
		});

		socket.on("disconnect", () => {
			if (userId) {
				connectedUsers.delete(String(userId));
			}
		});
	});
}
