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
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";

const formatPrice = (price) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(Number(price || 0));

export default function ProductDetail() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();
	const [listing, setListing] = useState(null);
	const [activeTab, setActiveTab] = useState("description");
	const [activeImage, setActiveImage] = useState("");
	const [loading, setLoading] = useState(true);
	const [sendingMessage, setSendingMessage] = useState(false);
	const [isLiked, setIsLiked] = useState(false);
	const [updatingLike, setUpdatingLike] = useState(false);

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

	useEffect(() => {
		const fetchLikedStatus = async () => {
			if (!isAuthenticated || !listing?.id) {
				setIsLiked(false);
				return;
			}

			try {
				const { data } = await api.get("/listings/liked/my");
				const likedRows = Array.isArray(data?.listings) ? data.listings : [];
				setIsLiked(
					likedRows.some(
						(item) => Number(item?._id || item?.id) === Number(listing.id),
					),
				);
			} catch {
				setIsLiked(false);
			}
		};

		fetchLikedStatus();
	}, [isAuthenticated, listing?.id]);

	const allImages = useMemo(() => {
		const images =
			listing?.images?.map((item) => item?.url || item).filter(Boolean) || [];
		if (!images.length && listing?.image) images.push(listing.image);
		return images;
	}, [listing]);

	const sendMessage = async () => {
		if (!isAuthenticated) {
			toast.error("Please log in to message sellers");
			navigate("/login");
			return;
		}

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
			if (!Number.isFinite(sellerId) || sellerId <= 0) {
				toast.error("Seller information is unavailable for this listing.");
				return;
			}

			const { data } = await api.post("/conversations", {
				recipientId: sellerId,
				listingId,
			});

			navigate("/messages", {
				state: {
					conversationId: data?.conversation?.id,
					listing: {
						id: listingId,
						title: listing?.title,
						price: listing?.price,
						location: listing?.location?.name || listing?.location || "",
						image:
							listing?.images?.[0]?.url ||
							listing?.images?.[0] ||
							listing?.image ||
							"",
					},
				},
			});
		} catch (error) {
			const status = error?.response?.status;
			if (status === 401) {
				toast.error("Please log in to message sellers");
				return;
			}
			toast.error(
				error?.response?.data?.message ||
					"Could not open conversation right now",
			);
		} finally {
			setSendingMessage(false);
		}
	};

	const toggleLike = async () => {
		if (!listing?.id) return;
		if (!isAuthenticated) {
			toast.error("Please log in to save products");
			return;
		}

		const listingIdentifier = listing?.productId || listing?._id || listing?.id;

		try {
			setUpdatingLike(true);
			if (isLiked) {
				await api.delete(`/listings/${listingIdentifier}/like`);
				setIsLiked(false);
				toast.success("Removed from liked products");
			} else {
				await api.post(`/listings/${listingIdentifier}/like`);
				setIsLiked(true);
				toast.success("Added to liked products");
			}
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update like");
		} finally {
			setUpdatingLike(false);
		}
	};

	const shareListing = async () => {
		if (!listing) return;

		const identifier = listing?.productId || listing?._id || listing?.id;
		const shareUrl = `${window.location.origin}/listing/${identifier}`;

		try {
			if (navigator.share) {
				await navigator.share({
					title: listing.title,
					text: `Check this listing: ${listing.title}`,
					url: shareUrl,
				});
			} else {
				await navigator.clipboard.writeText(shareUrl);
				toast.success("Share link copied");
			}
		} catch {
			toast.error("Unable to share this listing");
		}
	};

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main className="container-shell py-8 flex-1 lg:py-10">
				{loading ? (
					<div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
						<div className="h-[560px] animate-pulse rounded-[30px] bg-white" />
						<div className="h-[560px] animate-pulse rounded-[30px] bg-white" />
					</div>
				) : listing ? (
					<>
						<div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
							<Link
								to="/explore"
								className="font-semibold hover:text-brand-dark"
							>
								Explore
							</Link>
							<span>&gt;</span>
							<span>{listing?.category || "Category"}</span>
							<span>&gt;</span>
							<span className="line-clamp-1 font-medium text-brand-dark">
								{listing?.title}
							</span>
						</div>

						<section className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
							<div>
								<div className="relative overflow-hidden rounded-[30px] border border-brand-border bg-white shadow-sm">
									<img
										src={
											activeImage ||
											"https://placehold.co/1200x820?text=Deal.Post"
										}
										alt={listing?.title || "Listing image"}
										className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[560px]"
									/>
									<div className="absolute left-4 top-4 flex flex-wrap gap-2">
										<span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold shadow-sm">
											Verified
										</span>
										<span className="rounded-full bg-brand-yellow px-3 py-1 text-[11px] font-semibold text-brand-dark shadow-sm">
											Featured
										</span>
										{listing?.productId ? (
											<span className="rounded-full bg-black/85 px-3 py-1 text-[10px] font-semibold tracking-[0.08em] text-white">
												{listing.productId}
											</span>
										) : null}
									</div>
								</div>

								<div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
									{allImages.slice(0, 4).map((image, index) => (
										<button
											key={image + index}
											type="button"
											onClick={() => setActiveImage(image)}
											className={`overflow-hidden rounded-2xl border transition ${activeImage === image ? "border-brand-yellow ring-1 ring-brand-yellow" : "border-brand-border hover:border-brand-muted"}`}
										>
											<img
												src={image}
												alt={`Thumbnail ${index + 1}`}
												className="h-20 w-full object-cover sm:h-24 lg:h-28"
											/>
										</button>
									))}
								</div>
							</div>

							<div className="rounded-[30px] border border-brand-border bg-white p-6 shadow-sm sm:p-7 lg:sticky lg:top-24 lg:p-8">
								<div className="space-y-5">
									<div>
										<h1 className="text-3xl font-display font-bold leading-tight sm:text-4xl lg:text-5xl">
											{listing?.title}
										</h1>
										<p className="mt-2 text-2xl font-display font-bold text-brand-yellow sm:text-3xl">
											{listing?.subtitle || "Premium Listing"}
										</p>
									</div>

									<div className="flex items-end gap-3 border-b border-brand-border pb-5">
										<p className="font-mono text-3xl font-semibold text-brand-dark sm:text-4xl">
											{formatPrice(listing?.price)}
										</p>
										{listing?.originalPrice && (
											<p className="font-mono text-lg text-brand-muted line-through sm:text-xl">
												{formatPrice(listing.originalPrice)}
											</p>
										)}
									</div>

									<div className="grid gap-4 rounded-2xl bg-[#F8F8F8] p-4 sm:grid-cols-2">
										<div>
											<p className="text-[11px] tracking-[0.14em] text-brand-muted uppercase">
												Neighborhood
											</p>
											<div className="mt-1.5 flex items-center gap-2 text-sm font-medium">
												<MapPin size={15} />{" "}
												{listing?.location?.name ||
													listing?.location ||
													"Not specified"}
											</div>
										</div>

										<div>
											<p className="text-[11px] tracking-[0.14em] text-brand-muted uppercase">
												The Curator
											</p>
											<div className="mt-1.5 flex items-center gap-2 text-sm">
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

									<div className="grid gap-3 sm:grid-cols-2">
										<button
											type="button"
											disabled={sendingMessage}
											onClick={sendMessage}
											className="btn-secondary h-12 w-full rounded-xl text-sm disabled:opacity-60"
										>
											<Sparkles size={16} className="mr-2" />
											{sendingMessage ? "Opening chat..." : "Message Seller"}
										</button>
										<button
											type="button"
											onClick={shareListing}
											className="h-12 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold hover:bg-brand-bg"
										>
											<Share2 size={15} className="mr-2 inline" /> Curate Share
										</button>
									</div>

									<div className="flex flex-wrap items-center gap-5 text-sm text-brand-muted">
										<button
											type="button"
											onClick={toggleLike}
											disabled={updatingLike}
											className="inline-flex items-center gap-2 font-medium hover:text-brand-dark disabled:opacity-60"
										>
											<Heart
												size={15}
												className={isLiked ? "fill-current text-red-500" : ""}
											/>{" "}
											{isLiked ? "Liked" : "Like Product"}
										</button>
										{listing?.productId ? (
											<span className="rounded-full bg-[#F1F1F1] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#666666]">
												ID {listing.productId}
											</span>
										) : null}
									</div>

									<div className="rounded-2xl border border-brand-border bg-[#FAFAFA] p-4">
										<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-muted">
											The Narrative
										</p>
										<p className="mt-2 text-sm leading-relaxed text-brand-muted">
											{listing?.description ||
												"No narrative has been added to this listing yet."}
										</p>
									</div>
								</div>
							</div>
						</section>

						<section className="mt-10 rounded-[30px] border border-brand-border bg-white p-6 shadow-sm sm:p-8">
							<div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-[#F6F6F6] p-1.5 text-sm font-semibold uppercase tracking-[0.08em]">
								{[
									["description", "Description"],
									["specifications", "Specifications"],
									["ai", "AI Price Analysis"],
								].map(([key, label]) => (
									<button
										key={key}
										type="button"
										onClick={() => setActiveTab(key)}
										className={`rounded-xl px-4 py-2 text-xs transition sm:text-sm ${
											activeTab === key
												? "bg-white text-brand-dark shadow-sm"
												: "text-brand-muted hover:text-brand-dark"
										}`}
									>
										{key === "ai" && (
											<Sparkles size={12} className="mr-1 inline" />
										)}{" "}
										{label}
									</button>
								))}
							</div>

							{activeTab === "description" && (
								<div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
									<div className="space-y-3 text-brand-muted">
										<p className="text-sm leading-relaxed">
											{listing?.description || "No description available."}
										</p>
									</div>
									<div className="rounded-2xl border border-brand-border bg-[#FAFAFA] p-4">
										<p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-dark">
											Additional Notes
										</p>
										<p className="mt-2 text-sm text-brand-muted leading-relaxed">
											{listing?.additionalNotes ||
												"No additional notes provided."}
										</p>
									</div>
								</div>
							)}
							{activeTab === "specifications" &&
								(Object.keys(listing?.specs || {}).length ? (
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
										{Object.entries(listing?.specs || {}).map(
											([key, value]) => (
												<div
													key={key}
													className="rounded-2xl border border-brand-border bg-[#FAFAFA] p-4"
												>
													<p className="text-[11px] uppercase tracking-[0.1em] text-brand-muted">
														{key}
													</p>
													<p className="mt-1 text-base font-semibold text-brand-dark">
														{String(value)}
													</p>
												</div>
											),
										)}
									</div>
								) : (
									<div className="rounded-2xl border border-dashed border-brand-border bg-[#FAFAFA] p-6 text-sm text-brand-muted">
										No specifications were added for this product yet.
									</div>
								))}
							{activeTab === "ai" && (
								<div className="rounded-2xl border border-brand-border bg-[#FAFAFA] p-5 text-sm text-brand-muted">
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
