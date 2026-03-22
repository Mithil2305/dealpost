export default function ConversationItem({ conversation, active, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full rounded-2xl border p-3 text-left transition ${
				active
					? "border-brand-yellow bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)]"
					: "border-transparent bg-white/70 hover:border-brand-border"
			}`}
		>
			<div className="flex items-start gap-3">
				<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#d8d8d8]">
					<img
						src={
							conversation?.participant?.avatar ||
							"https://placehold.co/100x100?text=U"
						}
						alt={conversation?.participant?.name || "Avatar"}
						className="h-full w-full object-cover"
					/>
					{conversation?.participant?.online && (
						<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22c55e]" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-sm font-bold text-brand-dark">
							{conversation?.participant?.name || "Unknown"}
						</p>
						<p className="text-[11px] text-brand-muted">
							{conversation?.updatedAtLabel || ""}
						</p>
					</div>

					{conversation?.listing?.title && (
						<span className="my-1 inline-flex rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
							{conversation.listing.title}
						</span>
					)}

					<p className="line-clamp-1 text-xs text-brand-muted">
						{conversation?.lastMessage || "No messages yet"}
					</p>
				</div>
			</div>
		</button>
	);
}
