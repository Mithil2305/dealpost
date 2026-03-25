const STORAGE_KEY = "dealpost:conversationLastSeen";

function toMillis(value) {
	if (!value) return 0;
	const ms = new Date(value).getTime();
	return Number.isNaN(ms) ? 0 : ms;
}

export function readSeenMap() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export function markConversationSeen(
	conversationId,
	seenAt = new Date().toISOString(),
) {
	if (!conversationId) return;
	const key = String(conversationId);
	const currentMap = readSeenMap();
	const existing = toMillis(currentMap[key]);
	const incoming = toMillis(seenAt);
	const nextValue = incoming > existing ? seenAt : currentMap[key] || seenAt;

	const nextMap = {
		...currentMap,
		[key]: nextValue,
	};

	localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
	window.dispatchEvent(new CustomEvent("dealpost:conversation-seen-updated"));
}

export function getUnreadConversationCount(conversations, currentUserId) {
	const seenMap = readSeenMap();
	const myId = Number(currentUserId);
	if (!Array.isArray(conversations) || !Number.isFinite(myId)) return 0;

	return conversations.reduce((count, conversation) => {
		const lastMessage = conversation?.lastMessage;
		if (!lastMessage) return count;

		const isMine = Number(lastMessage.senderId) === myId;
		if (isMine) return count;

		const lastMessageTime = toMillis(lastMessage.createdAt);
		const seenTime = toMillis(seenMap[String(conversation.id)]);

		return lastMessageTime > seenTime ? count + 1 : count;
	}, 0);
}
