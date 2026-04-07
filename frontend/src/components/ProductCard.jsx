import { Heart, Scale } from "lucide-react";
import { Link } from "react-router-dom";

const currency = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0,
});

export default function ProductCard({ listing }) {
	const image =
		listing?.images?.[0]?.url ||
		listing?.image ||
		"https://placehold.co/600x600?text=Deal Post";
	const isAuction =
		String(listing?.listingType || "").toLowerCase() === "auction";
	const auctionCurrentBid = Number(
		listing?.auction?.currentBid ||
			listing?.currentBid ||
			listing?.startingBid ||
			0,
	);
	const numericPrice = Number(listing?.price || 0);
	const displayPrice = isAuction
		? auctionCurrentBid || numericPrice
		: numericPrice;
	const categoryLeaf = String(listing?.category || "General")
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean)
		.pop();
	const likedCount = Number(
		listing?.likedByCount || listing?.likeCount || listing?.likes || 0,
	);
	const listingDetailId =
		listing?.productId || listing?._id || listing?.id || "";
	const compareSeed = listing?._id || listing?.id || listing?.productId || "";

	return (
		<article className="group flex h-full flex-col rounded-[18px] border border-[#F0F2F5] bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(40,40,90,0.1)] sm:rounded-[24px] sm:p-3">
			<div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-[#F4F5F7] sm:aspect-[4/5] sm:rounded-[16px]">
				<img
					src={image}
					alt={
						listing?.title ? `${listing.title} listing image` : "Listing image"
					}
					loading="lazy"
					decoding="async"
					width="600"
					height="600"
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
					onError={(event) => {
						event.currentTarget.src =
							"https://placehold.co/600x600?text=Deal Post";
					}}
				/>

				<div className="absolute bottom-2 right-2 flex items-center rounded-lg bg-[#FFEBEB] px-2 py-1 shadow-sm sm:bottom-3 sm:right-3 sm:px-2.5 sm:py-1.5">
					<Heart
						size={13}
						className="mx-1 fill-[#1E1E38] text-[#1E1E38] sm:mx-1.5"
						aria-hidden="true"
					/>
					<div className="mx-1 h-3 w-[1.5px] bg-[#1E1E38]/15 sm:mx-1.5 sm:h-3.5" />
					<span className="text-xs font-medium text-[#1E1E38]/80 sm:text-[0.9rem]">
						{Number.isFinite(likedCount) ? likedCount : 0}
					</span>
				</div>
				{isAuction && (
					<div className="absolute left-2 top-2 rounded-full bg-black/85 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
						Auction
					</div>
				)}
			</div>

			<div className="flex flex-1 flex-col px-0.5 pb-1 pt-3 sm:px-1 sm:pb-2 sm:pt-4">
				<Link
					to={`/listing/${listingDetailId}`}
					className="line-clamp-1 text-[0.9rem] font-bold text-[#1E1E38] sm:text-[1.15rem]"
				>
					{listing?.title || "Untitled Listing"}
				</Link>
				<p className="mt-1 line-clamp-1 text-[0.72rem] font-medium text-[#8A8A9E] sm:text-[0.95rem]">
					{categoryLeaf || "General"}
				</p>

				<div className="my-2.5 h-px w-full bg-[#F0F2F5] sm:my-4" />

				<div className="mt-auto flex items-end justify-between">
					<div>
						<div className="flex items-baseline gap-2">
							<span className="leading-none text-[0.9rem] font-bold tracking-tight text-[#1E1E38] sm:text-[1.4rem]">
								{currency.format(displayPrice)}
							</span>
							{isAuction && (
								<span className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[#8b7008] sm:text-[0.65rem]">
									Current bid
								</span>
							)}
						</div>
					</div>

					<span className="rounded-full border border-[#d8dbe2] px-2 py-1 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-[#4f4f5f] sm:px-3 sm:text-[0.62rem]">
						{listing?.sellerType || "Verified"}
					</span>
				</div>

				<Link
					to={
						compareSeed
							? `/compare?seed=${encodeURIComponent(String(compareSeed))}`
							: "/compare"
					}
					className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#d8dbe2] px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#303045] transition hover:border-[#111111] hover:text-black sm:text-[0.7rem]"
				>
					<Scale size={12} /> Compare
				</Link>
			</div>
		</article>
	);
}
