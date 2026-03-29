import { Heart } from "lucide-react";
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
	const originalPrice = numericPrice > 0 ? numericPrice * 1.43 : 0;
	const displayPrice = isAuction
		? auctionCurrentBid || numericPrice
		: originalPrice > 0
			? originalPrice
			: numericPrice;
	const categoryLeaf = String(listing?.category || "General")
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean)
		.pop();
	const likedCount = Number(
		listing?.likedByCount || listing?.likeCount || listing?.likes || 0,
	);

	return (
		<article className="group flex flex-col rounded-[24px] border border-[#F0F2F5] bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(40,40,90,0.1)]">
			<div className="relative aspect-[4/5] w-full overflow-hidden rounded-[16px] bg-[#F4F5F7]">
				<img
					src={image}
					alt={listing?.title || "Listing image"}
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
					onError={(event) => {
						event.currentTarget.src =
							"https://placehold.co/600x600?text=Deal Post";
					}}
				/>

				<div className="absolute bottom-3 right-3 flex items-center rounded-lg bg-[#FFEBEB] px-2.5 py-1.5 shadow-sm">
					<Heart size={14} className="mx-1.5 fill-[#1E1E38] text-[#1E1E38]" />
					<div className="mx-1.5 h-3.5 w-[1.5px] bg-[#1E1E38]/15" />
					<span className="text-[0.9rem] font-medium text-[#1E1E38]/80">
						{Number.isFinite(likedCount) ? likedCount : 0}
					</span>
				</div>
				{isAuction && (
					<div className="absolute left-3 top-3 rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
						Auction
					</div>
				)}
			</div>

			<div className="flex flex-1 flex-col px-1 pb-2 pt-4">
				<Link
					to={`/listing/${listing?.productId || listing?._id || listing?.id || ""}`}
					className="line-clamp-1 text-[1.15rem] font-bold text-[#1E1E38]"
				>
					{listing?.title || "Untitled Listing"}
				</Link>
				<p className="mt-1 line-clamp-1 text-[0.95rem] font-medium text-[#8A8A9E]">
					{categoryLeaf || "General"}
				</p>

				<div className="my-4 h-px w-full bg-[#F0F2F5]" />

				<div className="mt-auto flex items-end justify-between">
					<div>
						<div className="flex items-baseline gap-2">
							<span className="leading-none text-[1.4rem] font-bold tracking-tight text-[#1E1E38]">
								{currency.format(displayPrice)}
							</span>
							{isAuction && (
								<span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#8b7008]">
									Current bid
								</span>
							)}
						</div>
					</div>

					<span className="rounded-full border border-[#d8dbe2] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#4f4f5f]">
						{listing?.sellerType || "Verified"}
					</span>
				</div>
			</div>
		</article>
	);
}
