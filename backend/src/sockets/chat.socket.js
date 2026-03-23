export function registerSocketHandlers(io) {
	io.on("connection", (socket) => {
		socket.on("join_conversation", (conversationId) => {
			socket.join(String(conversationId));
		});

		socket.on("send_message", ({ conversationId, message }) => {
			socket.to(String(conversationId)).emit("receive_message", message);
		});

		socket.on("typing", ({ conversationId, userName }) => {
			socket.to(String(conversationId)).emit("user_typing", { userName });
		});
	});
}
