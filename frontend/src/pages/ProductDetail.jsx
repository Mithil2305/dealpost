import {
	Heart,
	MapPin,
	Share2,
	Sparkles,
	Star,
	TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const formatPrice = (price) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(Number(price || 0));

export default function ProductDetail() {
	const { id } = useParams();
	const [listing, setListing] = useState(null);
	const [activeTab, setActiveTab] = useState("description");
	const [activeImage, setActiveImage] = useState("");
	const [loading, setLoading] = useState(true);
	const [sendingMessage, setSendingMessage] = useState(false);

	useEffect(() => {
		const fetchListing = async () => {
			try {
				setLoading(true);
				const { data } = await api.get(`/listings/${id}`);
				const entry = data?.listing || data;
				setListing(entry);
				setActiveImage(
					entry?.images?.[0]?.url ||
						entry?.image ||
						"https://placehold.co/1000x700?text=Deal.Post",
				);
			} catch {
				toast.error("Unable to load listing details");
			} finally {
				setLoading(false);
			}
		};

		fetchListing();
	}, [id]);

	const allImages = useMemo(() => {
		const images =
			listing?.images?.map((item) => item?.url || item).filter(Boolean) || [];
		if (!images.length && listing?.image) images.push(listing.image);
		return images;
	}, [listing]);

	const sendMessage = async () => {
		const listingId = Number(listing?._id || listing?.id);
		if (!Number.isFinite(listingId) || listingId <= 0) {
			toast.error(
				"Listing details are incomplete. Please refresh and try again.",
			);
			return;
		}

		try {
			setSendingMessage(true);
			const sellerId = Number(
				listing?.seller?._id || listing?.seller?.id || listing?.sellerId,
			);

			const payload = {
				listingId,
				text: "Hi, I am interested in this listing.",
			};

			if (Number.isFinite(sellerId) && sellerId > 0) {
				payload.sellerId = sellerId;
			}

			await api.post("/messages", payload);
			toast.success("Message request sent to seller");
		} catch (error) {
			const status = error?.response?.status;
			if (status === 401) {
				toast.error("Please log in to message sellers");
				return;
			}
			toast.error(
				error?.response?.data?.message || "Could not contact seller right now",
			);
		} finally {
			setSendingMessage(false);
		}
	};

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main className="container-shell py-6 flex-1">
				{loading ? (
					<div className="grid gap-5 lg:grid-cols-2">
						<div className="h-[520px] animate-pulse rounded-3xl bg-white" />
						<div className="h-[520px] animate-pulse rounded-3xl bg-white" />
					</div>
				) : listing ? (
					<>
						<div className="mb-5 text-sm text-brand-muted">
							<Link to="/explore">Explore</Link> &nbsp;&gt;&nbsp;{" "}
							{listing?.category || "Category"} &nbsp;&gt;&nbsp;{" "}
							{listing?.title}
						</div>

						<section className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
							<div>
								<div className="relative overflow-hidden rounded-[28px] border border-brand-border bg-white">
									<img
										src={
											activeImage ||
											"https://placehold.co/1200x820?text=Deal.Post"
										}
										alt={listing?.title || "Listing image"}
										className="h-[440px] w-full object-cover sm:h-[560px]"
									/>
									<div className="absolute left-4 top-4 flex gap-2">
										<span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold">
											Verified
										</span>
										<span className="rounded-full bg-brand-yellow px-3 py-1 text-[11px] font-semibold text-brand-dark">
											Featured
										</span>
									</div>
								</div>

								<div className="mt-4 grid grid-cols-4 gap-3">
									{allImages.slice(0, 4).map((image, index) => (
										<button
											key={image + index}
											type="button"
											onClick={() => setActiveImage(image)}
											className={`overflow-hidden rounded-2xl border ${activeImage === image ? "border-brand-yellow" : "border-brand-border"}`}
										>
											<img
												src={image}
												alt={`Thumbnail ${index + 1}`}
												className="h-24 w-full object-cover sm:h-28"
											/>
										</button>
									))}
								</div>
							</div>

							<div className="space-y-5">
								<h1 className="text-5xl leading-[0.9] font-display font-bold">
									{listing?.title}
								</h1>
								<p className="text-4xl font-display font-bold text-brand-yellow">
									{listing?.subtitle || "Matte Black"}
								</p>

								<div className="flex items-end gap-3">
									<p className="font-mono text-4xl font-semibold text-brand-dark">
										{formatPrice(listing?.price)}
									</p>
									{listing?.originalPrice && (
										<p className="font-mono text-xl text-brand-muted line-through">
											{formatPrice(listing.originalPrice)}
										</p>
									)}
								</div>

								<div>
									<p className="text-xs tracking-[0.2em] text-brand-muted uppercase">
										The Narrative
									</p>
									<p className="mt-2 text-brand-muted">
										{listing?.description ||
											"No narrative has been added to this listing yet."}
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-xs tracking-[0.2em] text-brand-muted uppercase">
											Neighborhood
										</p>
										<div className="mt-2 flex items-center gap-2 text-sm">
											<MapPin size={15} />{" "}
											{listing?.location?.name ||
												listing?.location ||
												"Not specified"}
										</div>
									</div>

									<div>
										<p className="text-xs tracking-[0.2em] text-brand-muted uppercase">
											The Curator
										</p>
										<div className="mt-2 flex items-center gap-2 text-sm">
											<img
												src={
													listing?.seller?.avatar ||
													"https://placehold.co/80x80?text=S"
												}
												alt={listing?.seller?.name || "Seller"}
												className="h-10 w-10 rounded-full object-cover"
											/>
											<span>{listing?.seller?.name || "Unknown seller"}</span>
											<span className="inline-flex items-center gap-1 text-xs text-brand-muted">
												<Star size={12} className="text-brand-yellow" />{" "}
												{listing?.seller?.rating || 0}
											</span>
										</div>
									</div>
								</div>

								<button
									type="button"
									disabled={sendingMessage}
									onClick={sendMessage}
									className="btn-secondary h-14 w-full rounded-2xl text-sm disabled:opacity-60"
								>
									<Sparkles size={16} className="mr-2" />
									{sendingMessage ? "Sending..." : "Message Seller"}
								</button>

								<div className="flex flex-wrap items-center gap-6 text-sm text-brand-muted">
									<button className="inline-flex items-center gap-2 hover:text-brand-dark">
										<Heart size={15} /> Add to Gallery
									</button>
									<button className="inline-flex items-center gap-2 hover:text-brand-dark">
										<Share2 size={15} /> Curate Share
									</button>
								</div>
							</div>
						</section>

						<section className="mt-10 border-t border-brand-border pt-7">
							<div className="mb-6 flex flex-wrap gap-6 text-sm font-semibold uppercase tracking-[0.1em]">
								{[
									["description", "Description"],
									["specifications", "Specifications"],
									["ai", "AI Price Analysis"],
								].map(([key, label]) => (
									<button
										key={key}
										type="button"
										onClick={() => setActiveTab(key)}
										className={
											activeTab === key ? "text-brand-dark" : "text-brand-muted"
										}
									>
										{key === "ai" && (
											<Sparkles size={12} className="mr-1 inline" />
										)}{" "}
										{label}
									</button>
								))}
							</div>

							{activeTab === "description" && (
								<p className="max-w-4xl text-brand-muted">
									{listing?.description || "No description available."}
								</p>
							)}
							{activeTab === "specifications" && (
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									{Object.entries(listing?.specs || {}).map(([key, value]) => (
										<div
											key={key}
											className="rounded-2xl border border-brand-border bg-white p-4"
										>
											<p className="text-[11px] uppercase tracking-[0.1em] text-brand-muted">
												{key}
											</p>
											<p className="mt-1 text-lg font-semibold">
												{String(value)}
											</p>
										</div>
									))}
								</div>
							)}
							{activeTab === "ai" && (
								<div className="rounded-2xl border border-brand-border bg-white p-4 text-sm text-brand-muted">
									<p className="font-semibold text-brand-dark">
										AI Price Analysis
									</p>
									<p className="mt-2">
										Comparable listings are trending around{" "}
										{formatPrice(listing?.price)} in this category. Pricing
										confidence is based on listing freshness, condition, and
										seller reputation.
									</p>
									<p className="mt-2 inline-flex items-center gap-2 text-[#9f6900]">
										<TriangleAlert size={14} /> A full model output is available
										when backend AI scoring is enabled.
									</p>
								</div>
							)}
						</section>
					</>
				) : (
					<div className="deal-card grid h-72 place-items-center text-brand-muted">
						This listing is no longer available.
					</div>
				)}

				<Footer />
			</main>
		</div>
	);
}
