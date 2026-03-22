import {
	ChevronLeft,
	EllipsisVertical,
	Phone,
	Plus,
	Search,
	Send,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";

import Navbar from "../components/Navbar";

// High-fidelity Mock Data matching the image
const MOCK_CONVERSATIONS = [
	{
		id: "c1",
		user: {
			name: "Liam",
			avatar: "https://randomuser.me/api/portraits/men/32.jpg",
			online: true,
		},
		lastMessage: "Sure, I can do $250. When can...",
		time: "10:32 AM",
		unread: false,
	},
	{
		id: "c2",
		user: {
			name: "Emma",
			avatar: "https://randomuser.me/api/portraits/women/44.jpg",
			online: false,
		},
		lastMessage: "Is the vintage camera still a...",
		time: "09:15 AM",
		unread: true,
	},
	{
		id: "c3",
		user: {
			name: "Noah",
			avatar: "https://randomuser.me/api/portraits/men/22.jpg",
			online: false,
		},
		lastMessage: "Thanks for the quick response!",
		time: "Yesterday",
		unread: false,
	},
	{
		id: "c4",
		user: {
			name: "Olivia",
			avatar: "https://randomuser.me/api/portraits/women/68.jpg",
			online: true,
		},
		lastMessage: "I'll think about it and let you kn...",
		time: "Yesterday",
		unread: false,
	},
	{
		id: "c5",
		user: {
			name: "William",
			avatar: "https://randomuser.me/api/portraits/men/46.jpg",
			online: false,
		},
		lastMessage: "Can you share more pictures of...",
		time: "Monday",
		unread: false,
	},
];

const MOCK_MESSAGES = [
	{
		id: "m1",
		senderId: "c1", // Liam
		text: "Hi, I'm interested in the Sony WH-1000XM5. Is the price negotiable?",
		time: "10:30 AM",
		isAdEmbed: true,
		adDetails: {
			title: "Sony WH-1000XM5",
			price: "$299",
			image:
				"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=200",
		},
	},
	{
		id: "m2",
		senderId: "me",
		text: "Hello! Yes, I'm open to slight negotiations. What were you thinking?",
		time: "10:31 AM",
	},
	{
		id: "m3",
		senderId: "c1", // Liam
		text: "Would you take $250 for it?",
		time: "10:31 AM",
	},
	{
		id: "m4",
		senderId: "me",
		text: "Sure, I can do $250. When can you pick it up?",
		time: "10:32 AM",
	},
];

export default function Messages() {
	const [activeConversationId, setActiveConversationId] = useState(
		MOCK_CONVERSATIONS[0].id,
	);
	const [search, setSearch] = useState("");
	const [text, setText] = useState("");

	// For mobile responsiveness: toggles between list view and chat view
	const [showChatOnMobile, setShowChatOnMobile] = useState(false);

	const activeConversation = MOCK_CONVERSATIONS.find(
		(c) => c.id === activeConversationId,
	);

	const handleSelectConversation = (id) => {
		setActiveConversationId(id);
		setShowChatOnMobile(true);
	};

	const handleSendMessage = (e) => {
		e.preventDefault();
		if (!text.trim()) return;
		// Logic to send message would go here
		setText("");
	};

	return (
		<div className="min-h-screen bg-[#F6F6F6] font-sans flex flex-col">
			<Navbar />

			<main className="flex-1 w-full max-w-[1400px] mx-auto p-0 md:p-6 lg:p-8 flex items-center justify-center">
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
							{MOCK_CONVERSATIONS.map((conv) => {
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
												src={conv.user.avatar}
												alt={conv.user.name}
												className="w-14 h-14 rounded-full object-cover bg-gray-200"
											/>
											{conv.user.online && (
												<div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
											)}
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between mb-1">
												<h3
													className={`text-[1.05rem] truncate ${isActive || conv.unread ? "font-bold text-black" : "font-semibold text-gray-800"}`}
												>
													{conv.user.name}
												</h3>
												<span
													className={`text-xs whitespace-nowrap ${conv.unread ? "font-bold text-black" : "font-medium text-[#A3A3A3]"}`}
												>
													{conv.time}
												</span>
											</div>
											<div className="flex items-center justify-between gap-2">
												<p
													className={`text-[0.9rem] truncate ${conv.unread ? "font-bold text-black" : "text-[#888888]"}`}
												>
													{conv.lastMessage}
												</p>
												{conv.unread && (
													<div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" />
												)}
											</div>
										</div>
									</div>
								);
							})}
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
									src={activeConversation?.user.avatar}
									alt="Active User"
									className="w-12 h-12 rounded-full object-cover bg-gray-200"
								/>
								<div>
									<h2 className="text-lg font-bold text-black leading-tight">
										{activeConversation?.user.name}
									</h2>
									<div className="flex items-center gap-1.5 mt-0.5">
										<div className="w-2 h-2 bg-green-500 rounded-full" />
										<span className="text-xs font-bold text-[#888888] uppercase tracking-wider">
											Online
										</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button className="grid h-10 w-10 place-items-center rounded-full bg-[#F4F4F4] hover:bg-[#EAEAEA] transition text-black">
									<Phone size={18} fill="currentColor" className="text-black" />
								</button>
								<button className="grid h-10 w-10 place-items-center rounded-full bg-[#F4F4F4] hover:bg-[#EAEAEA] transition text-black">
									<EllipsisVertical size={20} />
								</button>
							</div>
						</header>

						{/* Messages Area */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
							<div className="flex justify-center mb-6">
								<span className="px-4 py-1.5 rounded-full bg-[#F1F1F1] text-[0.75rem] font-bold text-[#A3A3A3] uppercase tracking-widest">
									Yesterday
								</span>
							</div>

							{MOCK_MESSAGES.map((msg) => {
								const isMe = msg.senderId === "me";

								return (
									<div
										key={msg.id}
										className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
									>
										<div
											className={`max-w-[85%] md:max-w-[70%] p-4 ${
												isMe
													? "bg-[#FFD600] text-black rounded-[24px] rounded-tr-[8px]"
													: "bg-[#F1F1F1] text-black rounded-[24px] rounded-tl-[8px]"
											}`}
										>
											{/* Optional Ad Embed Card */}
											{msg.isAdEmbed && msg.adDetails && (
												<div className="bg-white p-3 rounded-2xl flex items-center gap-4 mb-3 border border-gray-100 shadow-sm">
													<img
														src={msg.adDetails.image}
														alt="Product"
														className="w-14 h-14 rounded-xl object-cover bg-gray-50"
													/>
													<div className="flex-1">
														<h4 className="font-bold text-[0.95rem] text-black leading-tight">
															{msg.adDetails.title}
														</h4>
														<p className="font-bold text-[#FFD600] mt-1">
															{msg.adDetails.price}
														</p>
													</div>
													<button className="bg-black text-white text-[0.75rem] font-bold px-4 py-2 rounded-full uppercase tracking-wider hover:bg-gray-800 transition">
														View
													</button>
												</div>
											)}

											<p className="text-[0.95rem] leading-relaxed">
												{msg.text}
											</p>
										</div>

										<span className="text-[0.7rem] font-bold text-[#A3A3A3] mt-2 px-1">
											{msg.time}
										</span>
									</div>
								);
							})}
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
										placeholder="Type a message..."
										className="w-full bg-[#F4F4F4] rounded-full h-12 md:h-14 px-6 text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3]"
									/>
								</div>

								<button
									type="submit"
									className="grid h-12 w-12 md:h-14 md:w-14 flex-shrink-0 place-items-center rounded-full bg-[#FFD600] text-black hover:bg-[#E6C100] transition active:scale-95 shadow-sm"
								>
									<Send size={20} className="ml-1" />
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
