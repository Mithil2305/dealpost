import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

export default function ProductCard({ listing }) {
	const image =
		listing?.images?.[0]?.url ||
		listing?.image ||
		"https://placehold.co/600x600?text=Deal.Post";

	return (
		<article className="deal-card overflow-hidden rounded-2xl">
			<div className="relative h-52 bg-[#ececec]">
				<img
					src={image}
					alt={listing?.title || "Listing image"}
					className="h-full w-full object-cover"
					onError={(event) => {
						event.currentTarget.src =
							"https://placehold.co/600x600?text=Deal.Post";
					}}
				/>
				<button
					type="button"
					className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-brand-dark"
					aria-label="Save listing"
				>
					<Heart size={14} />
				</button>
				<span className="absolute bottom-3 left-3 rounded-full bg-black px-2.5 py-1 font-mono text-xs font-semibold text-white">
					{currency.format(Number(listing?.price || 0))}
				</span>
			</div>

			<div className="space-y-2 p-4">
				<Link
					to={`/listing/${listing?.productId || listing?._id || listing?.id || ""}`}
					className="line-clamp-2 text-lg font-display font-bold hover:text-brand-muted"
				>
					{listing?.title || "Untitled Listing"}
				</Link>

				<div className="flex items-center gap-2 text-[11px] text-brand-muted">
					<span className="rounded-full bg-brand-bg px-2 py-1 uppercase tracking-[0.1em]">
						{listing?.category || "General"}
					</span>
					<span className="rounded-full bg-[#e9f7ef] px-2 py-1 text-[#206744]">
						{listing?.sellerType || "Verified Seller"}
					</span>
				</div>

				<div className="flex items-center justify-between text-xs text-brand-muted">
					<span>
						{listing?.seller?.name || listing?.sellerName || "Curator"}
					</span>
					<span>
						{listing?.postedAtLabel || listing?.createdAtLabel || "Just now"}
					</span>
				</div>
			</div>
		</article>
	);
}
