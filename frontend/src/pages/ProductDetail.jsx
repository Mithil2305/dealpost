import {
	ArrowRightLeft,
	Clock3,
	Gavel,
	Heart,
	MapPin,
	MessageSquareText,
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
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import { getListingLikedCount, updateListingLikeStatus } from "../utils/likes";

const formatPrice = (price) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
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
	const [likedByCount, setLikedByCount] = useState(0);
	const [bidAmount, setBidAmount] = useState("");
	const [placingBid, setPlacingBid] = useState(false);

	useEffect(() => {
		const fetchListing = async () => {
			try {
				setLoading(true);
				const { data } = await api.get(`/listings/${id}`);
				const entry = data?.listing || data;
				setListing(entry);
				setLikedByCount(getListingLikedCount(entry));
				setIsLiked(Boolean(entry?.isLiked));
				setActiveImage(
					entry?.images?.[0]?.url ||
						entry?.image ||
						"https://placehold.co/1000x700?text=Deal Post",
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

	const placeBid = async () => {
		if (!isAuthenticated) {
			toast.error("Please log in to place bids");
			navigate("/login");
			return;
		}

		const amount = Number(bidAmount);
		if (!Number.isFinite(amount) || amount <= 0) {
			toast.error("Enter a valid bid amount");
			return;
		}

		try {
			setPlacingBid(true);
			const { data } = await api.post(`/listings/${id}/bids`, { amount });
			const updated = data?.listing;
			if (updated) {
				setListing(updated);
				setBidAmount("");
				toast.success("Bid placed successfully");
			}
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to place bid");
		} finally {
			setPlacingBid(false);
		}
	};

	const toggleLike = async () => {
		if (!listing?.id) return;
		if (!isAuthenticated) {
			toast.error("Please log in to save products");
			navigate("/login");
			return;
		}

		try {
			setUpdatingLike(true);
			const next = await updateListingLikeStatus({ listing, isLiked });
			setIsLiked(next.isLiked);
			setLikedByCount(next.likedByCount);
			setListing((prev) =>
				prev
					? {
							...prev,
							isLiked: next.isLiked,
							likedByCount: next.likedByCount,
						}
					: prev,
			);
			toast.success(
				next.isLiked
					? "Added to liked products"
					: "Removed from liked products",
			);
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
			await navigator.clipboard.writeText(shareUrl);
			toast.success("Share link copied");

			if (navigator.share) {
				try {
					await navigator.share({
						title: listing.title,
						text: `Check this listing: ${listing.title}`,
						url: shareUrl,
					});
				} catch {
					// Link already copied; ignore share-dismiss errors.
				}
			}
		} catch {
			toast.error("Unable to share this listing");
		}
	};

	const goToCompare = () => {
		if (!listing) return;
		const identifier = String(
			listing?.productId || listing?._id || listing?.id || "",
		).trim();
		if (!identifier) {
			toast.error("Listing cannot be compared right now");
			return;
		}
		navigate(`/compare?seed=${encodeURIComponent(identifier)}`);
	};

	const auction = listing?.auction;
	const isAuctionListing =
		String(listing?.listingType || "").toLowerCase() === "auction";
	const parentCategoryLabel =
		listing?.parentCategory ||
		String(listing?.category || "")
			.split(">")
			.map((part) => part.trim())
			.filter(Boolean)[0] ||
		"Category";
	const subCategoryLabel =
		listing?.subCategory ||
		String(listing?.category || "")
			.split(">")
			.map((part) => part.trim())
			.filter(Boolean)
			.slice(1)
			.join(" > ") ||
		"";
	const subCategoryFilterValue = subCategoryLabel
		? `${parentCategoryLabel} > ${subCategoryLabel}`
		: parentCategoryLabel;
	const tabOptions = [
		["description", "Description"],
		["specifications", "Specifications"],
	];

	const onTabKeyDown = (event, key) => {
		const currentIndex = tabOptions.findIndex(([tabKey]) => tabKey === key);
		if (currentIndex < 0) return;

		const focusTabByKey = (nextKey) => {
			setActiveTab(nextKey);
			window.requestAnimationFrame(() => {
				document.getElementById(`tab-${nextKey}`)?.focus();
			});
		};

		if (event.key === "ArrowRight") {
			event.preventDefault();
			const nextIndex = (currentIndex + 1) % tabOptions.length;
			focusTabByKey(tabOptions[nextIndex][0]);
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			const prevIndex =
				(currentIndex - 1 + tabOptions.length) % tabOptions.length;
			focusTabByKey(tabOptions[prevIndex][0]);
		}

		if (event.key === "Home") {
			event.preventDefault();
			focusTabByKey(tabOptions[0][0]);
		}

		if (event.key === "End") {
			event.preventDefault();
			focusTabByKey(tabOptions[tabOptions.length - 1][0]);
		}
	};

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main
				id="main-content"
				className="container-shell py-8 flex-1 pb-28 lg:py-10 lg:pb-10"
			>
				{loading ? (
					<div
						className="grid gap-6 lg:grid-cols-[1.35fr_1fr]"
						aria-busy="true"
					>
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
							<Link
								to={{
									pathname: "/explore",
									search: new URLSearchParams({
										category: subCategoryFilterValue,
									}).toString(),
								}}
								className="font-semibold hover:text-brand-dark"
							>
								{subCategoryLabel || parentCategoryLabel}
							</Link>
							<span>&gt;</span>
							<span className="line-clamp-1 font-medium text-brand-dark">
								{listing?.title}
							</span>
						</div>

						<section
							className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]"
							aria-label="Listing details"
						>
							<div>
								<div className="relative overflow-hidden rounded-[30px] border border-brand-border bg-white shadow-sm">
									<img
										src={
											activeImage ||
											"https://placehold.co/1200x820?text=Deal Post"
										}
										alt={listing?.title || "Listing image"}
										className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[560px]"
									/>
									<div className="absolute left-4 top-4 flex flex-wrap gap-2">
										{listing?.isVerified && (
											<span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold shadow-sm">
												Verified
											</span>
										)}

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
											aria-label={`View image ${index + 1}`}
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
									</div>

									<div className="flex items-end gap-3 border-b border-brand-border pb-5">
										<p className="font-inter text-3xl font-semibold text-brand-dark sm:text-4xl">
											{formatPrice(
												isAuctionListing
													? auction?.currentBid ||
															listing?.currentBid ||
															listing?.startingBid ||
															listing?.price
													: listing?.price,
											)}
										</p>
									</div>

									{isAuctionListing && (
										<div className="rounded-2xl border border-[#E6D9A7] bg-[#FFF9E5] p-4">
											<div className="flex items-center justify-between gap-3">
												<p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-[#8B7322]">
													<Gavel size={14} /> Live Auction
												</p>
												<p className="inline-flex items-center gap-1.5 text-xs text-[#6d5e21]">
													<Clock3 size={13} />
													{auction?.isEnded
														? "Ended"
														: auction?.endsAt
															? `Ends ${new Date(auction.endsAt).toLocaleString()}`
															: "Ending soon"}
												</p>
											</div>
											<p className="mt-2 text-xs text-[#6d5e21]">
												Starting bid:{" "}
												{formatPrice(
													auction?.startingBid ||
														listing?.startingBid ||
														listing?.price,
												)}
												- Bids: {auction?.bidCount || 0}
											</p>
											{!auction?.isEnded && (
												<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
													<input
														type="number"
														value={bidAmount}
														onChange={(event) =>
															setBidAmount(event.target.value)
														}
														placeholder={`Min ${auction?.minNextBid || "0"}`}
														className="h-11 rounded-xl border border-[#e2d399] bg-white px-3 text-sm outline-none"
													/>
													<Button
														type="button"
														onClick={placeBid}
														disabled={placingBid}
														isLoading={placingBid}
														variant="secondary"
														size="md"
														className="rounded-xl"
													>
														{placingBid ? "Placing..." : "Place Bid"}
													</Button>
												</div>
											)}
										</div>
									)}

									<div className="grid gap-4 rounded-2xl bg-[#F8F8F8] p-4 sm:grid-cols-2">
										<div>
											<p className="text-[11px] tracking-[0.14em] text-brand-muted uppercase">
												Location
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
												Seller
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
										<Button
											type="button"
											disabled={sendingMessage}
											onClick={sendMessage}
											isLoading={sendingMessage}
											variant="secondary"
											size="lg"
											className="rounded-xl"
										>
											<MessageSquareText size={16} className="mr-2 inline" />
											{sendingMessage ? "Opening chat..." : "Message Seller"}
										</Button>
										<Button
											type="button"
											onClick={shareListing}
											variant="outline"
											size="lg"
											className="rounded-xl"
										>
											<Share2 size={15} className="mr-2 inline" /> Share Product
										</Button>
										<Button
											type="button"
											onClick={goToCompare}
											variant="outline"
											size="lg"
											className="rounded-xl sm:col-span-2"
										>
											<ArrowRightLeft size={15} className="mr-2 inline" />{" "}
											Compare
										</Button>
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
											<span className="text-xs text-brand-muted">
												({likedByCount})
											</span>
										</button>
										{listing?.productId ? (
											<span className="rounded-full bg-[#F1F1F1] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#666666]">
												ID {listing.productId}
											</span>
										) : null}
									</div>
								</div>
							</div>
						</section>

						<section
							className="mt-10 rounded-[30px] border border-brand-border bg-white p-6 shadow-sm sm:p-8"
							aria-label="Listing information panels"
						>
							<div
								className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-[#F6F6F6] p-1.5 text-sm font-semibold uppercase tracking-[0.08em]"
								role="tablist"
								aria-label="Listing content tabs"
							>
								{tabOptions.map(([key, label]) => (
									<button
										key={key}
										type="button"
										onClick={() => setActiveTab(key)}
										onKeyDown={(event) => onTabKeyDown(event, key)}
										role="tab"
										aria-selected={activeTab === key}
										aria-controls={`panel-${key}`}
										id={`tab-${key}`}
										tabIndex={activeTab === key ? 0 : -1}
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
								<div
									className="grid gap-5 lg:grid-cols-[1.25fr_1fr]"
									role="tabpanel"
									id="panel-description"
									aria-labelledby="tab-description"
								>
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
									<div
										className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
										role="tabpanel"
										id="panel-specifications"
										aria-labelledby="tab-specifications"
									>
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
									<div
										className="rounded-2xl border border-dashed border-brand-border bg-[#FAFAFA] p-6 text-sm text-brand-muted"
										role="tabpanel"
										id="panel-specifications"
										aria-labelledby="tab-specifications"
									>
										No specifications were added for this product yet.
									</div>
								))}
						</section>
					</>
				) : (
					<div className="deal-card grid h-72 place-items-center text-brand-muted">
						This listing is no longer available.
					</div>
				)}
			</main>

			{listing ? (
				<div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-border bg-white/95 p-3 backdrop-blur lg:hidden">
					<div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
						<Button
							type="button"
							onClick={toggleLike}
							disabled={updatingLike}
							variant="outline"
							size="md"
							className="h-11 flex-1 rounded-xl"
						>
							<Heart
								size={15}
								className={isLiked ? "mr-1 fill-current text-red-500" : "mr-1"}
							/>
							{isLiked ? "Liked" : "Like"}
						</Button>
						<Button
							type="button"
							onClick={goToCompare}
							variant="outline"
							size="md"
							className="h-11 flex-1 rounded-xl"
						>
							<ArrowRightLeft size={15} className="mr-1" /> Compare
						</Button>
						<Button
							type="button"
							onClick={shareListing}
							variant="outline"
							size="md"
							className="h-11 flex-1 rounded-xl"
						>
							<Share2 size={15} className="mr-1" /> Share
						</Button>
						<Button
							type="button"
							onClick={sendMessage}
							disabled={sendingMessage}
							isLoading={sendingMessage}
							variant="secondary"
							size="md"
							className="h-11 flex-[1.3] rounded-xl"
						>
							<MessageSquareText size={15} className="mr-1" />
							Message
						</Button>
					</div>
				</div>
			) : null}
			<Footer />
		</div>
	);
}
