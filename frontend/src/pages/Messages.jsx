import {
	ChevronLeft,
	EllipsisVertical,
	LoaderCircle,
	Phone,
	Plus,
	Search,
	Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { markConversationSeen } from "../utils/messageNotifications";

import Navbar from "../components/Navbar";

const formatTime = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getMessageDateKey = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-");
};

const formatDateLabel = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

const formatPrice = (value) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return "";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(numeric);
};

const getListingImage = (listing) => {
	if (!listing) return "";
	return (
		listing?.image || listing?.images?.[0]?.url || listing?.images?.[0] || ""
	);
};

export default function Messages() {
	const { user } = useAuth();
	const location = useLocation();
	const [conversations, setConversations] = useState([]);
	const [messages, setMessages] = useState([]);
	const [loadingConversations, setLoadingConversations] = useState(true);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [sending, setSending] = useState(false);
	const [activeConversationId, setActiveConversationId] = useState(null);
	const [search, setSearch] = useState("");
	const [text, setText] = useState("");
	const [animatedMessageIds, setAnimatedMessageIds] = useState([]);
	const [initiatedListing, setInitiatedListing] = useState(null);
	const messagesEndRef = useRef(null);
	const initiatedConversationIdRef = useRef(null);

	// For mobile responsiveness: toggles between list view and chat view
	const [showChatOnMobile, setShowChatOnMobile] = useState(false);

	useEffect(() => {
		const requestedConversationId = Number(location.state?.conversationId);
		if (
			Number.isFinite(requestedConversationId) &&
			requestedConversationId > 0
		) {
			initiatedConversationIdRef.current = requestedConversationId;
			setActiveConversationId(requestedConversationId);
			setShowChatOnMobile(true);
		}

		if (location.state?.listing) {
			setInitiatedListing(location.state.listing);
		}
	}, [location.state]);

	useEffect(() => {
		const fetchConversations = async (showLoading = true) => {
			try {
				if (showLoading) {
					setLoadingConversations(true);
				}
				const { data } = await api.get("/conversations");
				const rows = Array.isArray(data?.conversations)
					? data.conversations
					: [];
				setConversations(rows);
				setActiveConversationId((prev) => {
					if (prev) return prev;
					const requestedId = initiatedConversationIdRef.current;
					if (
						requestedId &&
						rows.some((row) => Number(row.id) === Number(requestedId))
					) {
						return requestedId;
					}
					return rows[0]?.id || null;
				});
			} catch {
				toast.error("Unable to load conversations");
			} finally {
				if (showLoading) {
					setLoadingConversations(false);
				}
			}
		};

		fetchConversations(true);

		const intervalId = window.setInterval(() => {
			if (document.hidden) return;
			fetchConversations(false);
		}, 9000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, []);

	const trackAnimatedMessage = useCallback((messageKey) => {
		if (!messageKey) return;
		setAnimatedMessageIds((prev) => [...prev, messageKey]);
		window.setTimeout(() => {
			setAnimatedMessageIds((prev) => prev.filter((id) => id !== messageKey));
		}, 450);
	}, []);

	useEffect(() => {
		const fetchMessages = async (showLoading = true, animateNew = false) => {
			if (!activeConversationId) {
				setMessages([]);
				return;
			}

			try {
				if (showLoading) {
					setLoadingMessages(true);
				}
				const { data } = await api.get(
					`/conversations/${activeConversationId}/messages`,
				);
				const nextMessages = Array.isArray(data?.messages) ? data.messages : [];

				setMessages((prev) => {
					if (animateNew && prev.length) {
						const previousKeys = new Set(
							prev.map((msg) => String(msg.id || msg._id)),
						);
						nextMessages.forEach((msg) => {
							const key = String(msg.id || msg._id);
							if (!previousKeys.has(key)) {
								trackAnimatedMessage(key);
							}
						});
					}

					return nextMessages;
				});

				const latestMessage = nextMessages[nextMessages.length - 1];
				if (latestMessage?.createdAt) {
					markConversationSeen(activeConversationId, latestMessage.createdAt);
				}
			} catch {
				if (showLoading) {
					toast.error("Unable to load messages");
				}
			} finally {
				if (showLoading) {
					setLoadingMessages(false);
				}
			}
		};

		fetchMessages(true, false);

		const intervalId = window.setInterval(() => {
			if (document.hidden) return;
			fetchMessages(false, true);
		}, 4000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [activeConversationId, trackAnimatedMessage]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end",
		});
	}, [messages]);

	const normalizedConversations = useMemo(() => {
		const myId = Number(user?.id);
		const filtered = conversations.filter((conversation) => {
			const participantName =
				Number(conversation?.buyerId) === myId
					? conversation?.seller?.name
					: conversation?.buyer?.name;
			return String(participantName || "")
				.toLowerCase()
				.includes(search.toLowerCase());
		});

		return filtered.map((conversation) => {
			const isBuyer = Number(conversation?.buyerId) === myId;
			const participant = isBuyer ? conversation?.seller : conversation?.buyer;

			return {
				...conversation,
				participant: {
					id: participant?.id,
					name: participant?.name || "Unknown",
					avatar:
						participant?.avatar ||
						`https://ui-avatars.com/api/?name=${encodeURIComponent(participant?.name || "User")}`,
				},
				lastMessageText: conversation?.lastMessage?.text || "No messages yet",
				lastMessageTime: formatTime(conversation?.lastMessage?.createdAt),
			};
		});
	}, [conversations, search, user?.id]);

	const activeConversation = normalizedConversations.find(
		(conversation) => conversation.id === activeConversationId,
	);

	const activeListing =
		activeConversation?.listing ||
		(Number(activeConversationId) === Number(initiatedConversationIdRef.current)
			? initiatedListing
			: null);

	const handleSelectConversation = (id) => {
		setActiveConversationId(id);
		setShowChatOnMobile(true);
		if (Number(id) !== Number(initiatedConversationIdRef.current)) {
			setInitiatedListing(null);
		}
		const selectedConversation = conversations.find(
			(conversation) => conversation.id === id,
		);
		const seenAt = selectedConversation?.lastMessage?.createdAt || new Date();
		markConversationSeen(id, seenAt);
	};

	const handleSendMessage = async (e) => {
		e.preventDefault();
		const value = text.trim();
		if (!value || !activeConversationId) return;

		const optimisticId = `temp-${Date.now()}`;
		const optimisticMessage = {
			id: optimisticId,
			text: value,
			senderId: user?.id,
			createdAt: new Date().toISOString(),
			pending: true,
		};

		setMessages((prev) => [...prev, optimisticMessage]);
		trackAnimatedMessage(optimisticId);
		setText("");

		try {
			setSending(true);
			const { data } = await api.post(
				`/conversations/${activeConversationId}/messages`,
				{ text: value },
			);

			const nextMessage = data?.message;
			if (nextMessage) {
				setMessages((prev) =>
					prev.map((msg) => (msg.id === optimisticId ? nextMessage : msg)),
				);
				setConversations((prev) =>
					prev.map((conversation) =>
						conversation.id === activeConversationId
							? {
									...conversation,
									lastMessage: nextMessage,
									updatedAt: nextMessage.createdAt,
								}
							: conversation,
					),
				);
				markConversationSeen(activeConversationId, nextMessage.createdAt);
			}
		} catch {
			setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
			setText(value);
			toast.error("Could not send message");
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F6F6F6] font-sans flex flex-col">
			<Navbar />

			<main
				id="main-content"
				className="flex-1 w-full max-w-[1400px] mx-auto p-0 md:p-6 lg:p-8 flex items-center justify-center"
			>
				<div className="flex w-full h-[calc(100vh-64px)] md:h-[calc(100vh-140px)] bg-white md:rounded-[32px] overflow-hidden shadow-sm border border-gray-100">
					{/* Left Sidebar - Conversation List */}
					<aside
						className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex-col border-r border-gray-100 bg-white ${showChatOnMobile ? "hidden md:flex" : "flex"}`}
					>
						<div className="p-6 pb-4">
							<h1 className="text-[1.75rem] font-bold text-black mb-6">
								Messages
							</h1>

							<div className="flex items-center rounded-xl bg-[#F4F4F4] px-4 py-3">
								<Search size={18} className="text-[#A3A3A3]" />
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search messages..."
									className="ml-3 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-[#A3A3A3] text-black"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-hide">
							{loadingConversations ? (
								<div className="px-3 py-5 text-sm text-[#888888]">
									Loading conversations...
								</div>
							) : normalizedConversations.length ? (
								normalizedConversations.map((conv) => {
									const isActive = activeConversationId === conv.id;
									return (
										<div
											key={conv.id}
											onClick={() => handleSelectConversation(conv.id)}
											className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${
												isActive ? "bg-[#FFF9E6]" : "hover:bg-gray-50"
											}`}
										>
											{/* Active Left Indicator */}
											{isActive && (
												<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-[#FFD600] rounded-r-md" />
											)}

											<div className="relative">
												<img
													src={conv.participant.avatar}
													alt={conv.participant.name}
													className="w-14 h-14 rounded-full object-cover bg-gray-200"
												/>
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<h3
														className={`text-[1.05rem] truncate ${isActive ? "font-bold text-black" : "font-semibold text-gray-800"}`}
													>
														{conv.participant.name}
													</h3>
													<span className="text-xs whitespace-nowrap font-medium text-[#A3A3A3]">
														{conv.lastMessageTime}
													</span>
												</div>
												<div className="flex items-center justify-between gap-2">
													<p className="text-[0.9rem] truncate text-[#888888]">
														{conv.lastMessageText}
													</p>
												</div>
											</div>
										</div>
									);
								})
							) : (
								<div className="px-3 py-5 text-sm text-[#888888]">
									No conversations yet.
								</div>
							)}
						</div>
					</aside>

					{/* Right Panel - Active Chat */}
					<section
						className={`flex-1 flex-col bg-white relative ${!showChatOnMobile ? "hidden md:flex" : "flex"}`}
					>
						{/* Chat Header */}
						<header className="h-[88px] border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
							<div className="flex items-center gap-4">
								<button
									className="md:hidden mr-2 text-gray-500"
									onClick={() => setShowChatOnMobile(false)}
								>
									<ChevronLeft size={24} />
								</button>

								<img
									src={
										activeConversation?.participant?.avatar ||
										"https://placehold.co/80x80?text=U"
									}
									alt="Active User"
									className="w-12 h-12 rounded-full object-cover bg-gray-200"
								/>
								<div>
									<h2 className="text-lg font-bold text-black leading-tight">
										{activeConversation?.participant?.name ||
											"Select a conversation"}
									</h2>
									<div className="flex items-center gap-1.5 mt-0.5">
										<div className="w-2 h-2 bg-gray-400 rounded-full" />
										<span className="text-xs font-bold text-[#888888] uppercase tracking-wider">
											Presence unavailable
										</span>
									</div>
								</div>
							</div>
						</header>

						{/* Messages Area */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
							<div className="flex justify-center mb-6">
								<span className="px-4 py-1.5 rounded-full bg-[#F1F1F1] text-[0.75rem] font-bold text-[#A3A3A3] uppercase tracking-widest">
									Conversation
								</span>
							</div>

							{activeListing && (
								<div className="mx-auto w-full max-w-[520px] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
									<div className="flex items-center gap-3">
										<img
											src={
												getListingImage(activeListing) ||
												"https://placehold.co/120x90?text=Deal Post"
											}
											alt={activeListing?.title || "Listing"}
											className="h-16 w-20 rounded-lg object-cover bg-gray-100"
										/>
										<div className="min-w-0">
											<p className="text-[11px] font-bold uppercase tracking-wider text-[#999999]">
												Product Context
											</p>
											<p className="truncate text-sm font-semibold text-black">
												{activeListing?.title || "Selected Listing"}
											</p>
											<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#777777]">
												{formatPrice(activeListing?.price) && (
													<span className="font-semibold text-[#5C4D00]">
														{formatPrice(activeListing?.price)}
													</span>
												)}
												{activeListing?.location && (
													<span className="truncate">
														{activeListing.location}
													</span>
												)}
											</div>
										</div>
									</div>
								</div>
							)}

							{loadingMessages ? (
								<div className="text-center text-sm text-[#888888]">
									Loading messages...
								</div>
							) : messages.length ? (
								messages.map((msg, index) => {
									const isMe = Number(msg.senderId) === Number(user?.id);
									const messageKey = String(msg.id || msg._id);
									const shouldAnimate = animatedMessageIds.includes(messageKey);
									const currentDateKey = getMessageDateKey(msg.createdAt);
									const previousDateKey = getMessageDateKey(
										messages[index - 1]?.createdAt,
									);
									const showDateLabel =
										currentDateKey && currentDateKey !== previousDateKey;

									return (
										<div key={messageKey}>
											{showDateLabel ? (
												<div className="my-5 flex justify-center">
													<span className="px-4 py-1.5 rounded-full bg-[#F1F1F1] text-[0.72rem] font-bold text-[#8D8D8D] uppercase tracking-wider">
														{formatDateLabel(msg.createdAt)}
													</span>
												</div>
											) : null}
											<div
												className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
											>
												<div
													className={`max-w-[85%] md:max-w-[70%] p-4 ${
														isMe
															? "bg-[#FFD600] text-black rounded-[24px] rounded-tr-[8px]"
															: "bg-[#F1F1F1] text-black rounded-[24px] rounded-tl-[8px]"
													} ${shouldAnimate ? (isMe ? "message-pop-outgoing" : "message-pop-incoming") : ""} ${msg.pending ? "opacity-80" : ""}`}
												>
													<p className="text-[0.95rem] leading-relaxed">
														{msg.text}
													</p>
												</div>

												<span className="mt-2 px-1 text-[0.7rem] font-bold text-[#A3A3A3]">
													{msg.pending
														? "Sending..."
														: formatTime(msg.createdAt)}
												</span>
											</div>
										</div>
									);
								})
							) : (
								<div className="text-center text-sm text-[#888888]">
									No messages yet. Say hello.
								</div>
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Input Area */}
						<div className="border-t border-gray-100 p-4 md:p-6 bg-white flex-shrink-0">
							<form
								onSubmit={handleSendMessage}
								className="flex items-center gap-3 md:gap-4 max-w-4xl mx-auto"
							>
								<button
									type="button"
									className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition"
								>
									<Plus size={24} />
								</button>

								<div className="flex-1 relative">
									<input
										value={text}
										onChange={(e) => setText(e.target.value)}
										disabled={!activeConversationId || sending}
										placeholder="Type a message..."
										className="w-full bg-[#F4F4F4] rounded-full h-12 md:h-14 px-6 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3]"
									/>
								</div>

								<button
									type="submit"
									disabled={!activeConversationId || sending}
									className="grid h-12 w-12 md:h-14 md:w-14 flex-shrink-0 place-items-center rounded-full bg-[#FFD600] text-black hover:bg-[#E6C100] transition active:scale-95 shadow-sm"
								>
									{sending ? (
										<LoaderCircle size={20} className="animate-spin" />
									) : (
										<Send size={20} className="ml-1" />
									)}
								</button>
							</form>
						</div>
					</section>
				</div>
			</main>
			<Footer />
		</div>
	);
}
