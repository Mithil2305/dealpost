import {
	ArrowRight,
	ChevronRight,
	Clock,
	Heart,
	MapPin,
	Monitor,
	Search,
	Sofa,
	Sparkles,
	Star,
	User,
	Car,
	Gem,
	Home as HomeIcon,
	Trophy,
	Zap,
	ChevronLeft,
	Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdSidebar from "../components/ad-sidebar";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";
import {
	fetchMyLikedListingIds,
	getListingLikedCount,
	getListingNumericId,
	isListingLiked,
	updateListingLikeStatus,
} from "../utils/likes";

const CATEGORY_ICONS = [Monitor, Sofa, User, Car, Gem, HomeIcon, Trophy];

const formatPrice = (value) => {
	const numeric = Number(value || 0);
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(numeric);
};

const timeAgo = (value) => {
	if (!value) return "Just now";
	const then = new Date(value);
	if (Number.isNaN(then.getTime())) return "Just now";

	const diffMs = Date.now() - then.getTime();
	const diffMins = Math.max(Math.floor(diffMs / 60000), 0);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 30) return `${diffDays}d ago`;

	return then.toLocaleDateString();
};

const getEndSubCategory = (value) => {
	if (!value) return "General";
	const parts = String(value)
		.split(">")
		.map((segment) => segment.trim())
		.filter(Boolean);
	return parts[parts.length - 1] || "General";
};

const normalizeListing = (item) => {
	const id = item?._id || item?.id;
	const numericPrice = Number(item?.price || 15006);
	const originalPriceNum = numericPrice > 0 ? numericPrice * 1.43 : 356;

	return {
		id,
		productId: item?.productId || null,
		title: item?.title || "Heimer Miller Sofa",
		category: getEndSubCategory(item?.category),
		price: formatPrice(numericPrice),
		originalPrice: formatPrice(originalPriceNum),
		likedByCount: getListingLikedCount(item),
		isLiked: Boolean(item?.isLiked),
		image:
			item?.images?.[0]?.url ||
			item?.image ||
			"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800", // Fallback to a shoe matching the vibe
		seller: {
			name: item?.seller?.name || "Banana Mania",
			avatar:
				item?.seller?.avatar ||
				`https://ui-avatars.com/api/?name=${encodeURIComponent(item?.seller?.name || "Seller")}`,
		},
		time: timeAgo(item?.createdAt),
	};
};

const getMainCategory = (value) => {
	if (!value) return "General";
	return String(value).split(">")[0]?.trim() || "General";
};

export default function Home() {
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();
	const [search, setSearch] = useState("");
	const [categories, setCategories] = useState([]);
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [likedListingIds, setLikedListingIds] = useState([]);
	const [likingByListingId, setLikingByListingId] = useState({});
	const [selectedCompareIds, setSelectedCompareIds] = useState([]);
	const [selectedCompareCategory, setSelectedCompareCategory] = useState("");
	const [topDealsIndex, setTopDealsIndex] = useState(0);
	const [slideDirection, setSlideDirection] = useState("next");

	useEffect(() => {
		const fetchHomeData = async () => {
			try {
				setLoading(true);
				const [categoriesRes, listingsRes] = await Promise.all([
					api.get("/categories"),
					api.get("/listings", {
						params: { limit: 10, sort: "Newest", search: search || undefined },
					}),
				]);

				const categoryRows = pickArray(categoriesRes?.data, [
					"categories",
					"data",
					"items",
				]);
				setCategories(categoryRows);

				const listingRows = pickArray(listingsRes?.data, [
					"listings",
					"items",
					"data",
				]);
				setListings(listingRows);
			} catch {
				toast.error("Could not load homepage data");
			} finally {
				setLoading(false);
			}
		};

		fetchHomeData();
	}, [search]);

	useEffect(() => {
		let active = true;

		const hydrateLikedIds = async () => {
			if (!isAuthenticated) {
				setLikedListingIds([]);
				return;
			}

			try {
				const ids = await fetchMyLikedListingIds();
				if (active) {
					setLikedListingIds(ids);
				}
			} catch {
				if (active) {
					setLikedListingIds([]);
				}
			}
		};

		hydrateLikedIds();

		return () => {
			active = false;
		};
	}, [isAuthenticated]);

	const displayListings = listings.map(normalizeListing);
	const sidebarCategories = Array.from(
		new Set(
			categories.map((cat) => getMainCategory(cat?.name)).filter(Boolean),
		),
	).slice(0, 7);
	const topDeals = displayListings.slice(0, 8);
	const topDealsCount = topDeals.length;

	useEffect(() => {
		if (!topDealsCount) {
			setTopDealsIndex(0);
			return;
		}
		setTopDealsIndex((prev) => prev % topDealsCount);
	}, [topDealsCount]);

	const getTopDealAt = (offset) => {
		if (!topDealsCount) return null;
		const index = (topDealsIndex + offset + topDealsCount * 5) % topDealsCount;
		return topDeals[index] || null;
	};

	const featuredDeal = getTopDealAt(0);
	const leftDeal = getTopDealAt(-1);
	const rightDeal = getTopDealAt(1);

	const buildCompareUrl = (...deals) => {
		const ids = deals
			.map((deal) => deal?.productId || deal?.id)
			.filter(Boolean)
			.slice(0, 4);
		if (ids.length < 2) return "/compare";
		return `/compare?ids=${encodeURIComponent(ids.join(","))}`;
	};

	const launchCompareForDeals = (...deals) => {
		const validDeals = deals.filter(Boolean);
		if (validDeals.length < 2) {
			toast.error("Select at least 2 products to compare");
			return;
		}

		const baseCategory = String(validDeals[0]?.category || "").trim();
		const sameCategoryDeals = validDeals.filter(
			(deal) => String(deal?.category || "").trim() === baseCategory,
		);

		if (sameCategoryDeals.length < 2) {
			toast.error("Choose products from the same category to compare");
			return;
		}

		navigate(buildCompareUrl(...sameCategoryDeals));
	};

	const toggleCompareSelection = (event, item) => {
		event.preventDefault();
		event.stopPropagation();

		const itemId = item?.productId || item?.id;
		if (!itemId) return;
		const itemCategory = String(item?.category || "").trim();

		setSelectedCompareIds((prev) => {
			if (prev.includes(itemId)) {
				const next = prev.filter((id) => id !== itemId);
				if (!next.length) {
					setSelectedCompareCategory("");
				}
				return next;
			}

			if (!prev.length) {
				setSelectedCompareCategory(itemCategory);
				return [itemId];
			}

			if (itemCategory !== selectedCompareCategory) {
				toast.error(
					`Only ${selectedCompareCategory || "same category"} products can be compared`,
				);
				return prev;
			}

			if (prev.length >= 4) {
				toast.error("You can compare up to 4 products");
				return prev;
			}

			return [...prev, itemId];
		});
	};

	const selectedCompareDeals = displayListings.filter((item) =>
		selectedCompareIds.includes(item?.productId || item?.id),
	);

	const moveTopDeals = (direction) => {
		if (topDealsCount < 2) return;
		setSlideDirection(direction);
		setTopDealsIndex((prev) => {
			if (direction === "prev") {
				return (prev - 1 + topDealsCount) % topDealsCount;
			}
			return (prev + 1) % topDealsCount;
		});
	};

	const onToggleLike = async (event, item) => {
		event.preventDefault();
		event.stopPropagation();

		if (!isAuthenticated) {
			toast.error("Please log in to save products");
			navigate("/login");
			return;
		}

		const listingId = getListingNumericId(item);
		if (!listingId || likingByListingId[listingId]) return;

		const currentlyLiked = isListingLiked(item, likedListingIds);

		try {
			setLikingByListingId((prev) => ({ ...prev, [listingId]: true }));

			const next = await updateListingLikeStatus({
				listing: item,
				isLiked: currentlyLiked,
			});

			setLikedListingIds(next.likedListingIds || []);
			setListings((prev) =>
				prev.map((row) => {
					const rowId = getListingNumericId(row);
					if (rowId !== listingId) return row;
					return {
						...row,
						isLiked: next.isLiked,
						likedByCount: next.likedByCount,
					};
				}),
			);

			toast.success(
				next.isLiked
					? "Added to liked products"
					: "Removed from liked products",
			);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update like");
		} finally {
			setLikingByListingId((prev) => {
				const next = { ...prev };
				delete next[listingId];
				return next;
			});
		}
	};

	return (
		<div className="min-h-screen bg-white font-sans text-black flex flex-col">
			{/* Navbar would go here, assuming it's imported and handles its own layout */}
			<Navbar showSearch search={search} onSearchChange={setSearch} />

			<main className="mx-auto w-full max-w-[1780px] px-4 py-6 sm:px-6 lg:px-8 flex-1">
				<div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
					<AdSidebar side="left" />

					<div className="min-w-0">
						{/* Categories Row */}
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold font-display">Fast browse</h2>
							<Link
								to="/categories"
								className="text-sm font-bold text-[#666666] hover:text-black transition-colors"
							>
								View All →
							</Link>
						</div>
						<section className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
							{sidebarCategories.map((catName, index) => {
								const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length];
								const active = index === 0;
								return (
									<Link
										key={catName || index}
										to={`/explore?category=${encodeURIComponent(catName || "General")}`}
										className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
											active
												? "bg-[#FFD600] text-black shadow-sm"
												: "bg-[#F8F8F8] text-[#666666] hover:bg-[#F0F0F0]"
										}`}
									>
										<Icon
											size={16}
											className={active ? "text-black" : "text-[#666666]"}
										/>
										{catName || "General"}
									</Link>
								);
							})}
						</section>

						{/* Hero Section */}
						<section className="mt-4 grid gap-6 rounded-[32px] bg-[#111111] p-8 md:p-14 lg:grid-cols-[1.2fr_1fr] overflow-hidden relative">
							{/* Left Content */}
							<div className="flex flex-col justify-center space-y-6 relative z-10">
								<div className="inline-flex items-center gap-2 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 px-3 py-1.5 w-max">
									<span className="text-[0.65rem] font-bold tracking-[0.15em] text-[#FFD600] uppercase">
										Reselling Marketplace
									</span>
								</div>

								<h1 className="text-[3.5rem] leading-[1.05] font-bold tracking-tight text-white md:text-[4.5rem]">
									Turn your Space into <br />
									<span className="text-[#FFD600]">Value</span>
								</h1>

								<p className="max-w-md text-[#888888] text-[1.05rem] leading-relaxed">
									The world's first curated exchange where high-end design meets
									effortless peer-to-peer liquidity.
								</p>

								<div className="flex flex-wrap items-center gap-4 pt-4">
									<Link
										className="rounded-full bg-[#FFD600] px-8 py-3.5 text-sm font-bold text-black hover:bg-[#E6C100] transition"
										to="/explore"
									>
										Explore Listings
									</Link>
									<button
										type="button"
										onClick={() =>
											launchCompareForDeals(featuredDeal, rightDeal)
										}
										className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition"
									>
										Compare Top Deals
									</button>
								</div>
							</div>

							{/* Right Content - Featured Deal */}
							<div className="relative z-10 hidden lg:flex items-center justify-end">
								<div className="bg-white rounded-[40px] p-6 w-[420px] aspect-square relative shadow-2xl">
									<div className="absolute top-8 left-8 inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 z-20">
										<Zap size={10} className="text-[#FFD600] fill-[#FFD600]" />
										<span className="text-[0.6rem] font-bold tracking-[0.15em] text-white uppercase">
											Top Deals For You
										</span>
									</div>

									<div
										key={`hero-deal-${topDealsIndex}-${slideDirection}`}
										className={`w-full h-full bg-[#1A1A1A] rounded-[28px] overflow-hidden relative group ${slideDirection === "next" ? "deal-slide-next" : "deal-slide-prev"}`}
									>
										<img
											src={
												featuredDeal?.image ||
												"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800"
											}
											alt={featuredDeal?.title || "Headphones"}
											className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
										/>

										<div className="absolute inset-x-4 bottom-4 rounded-[20px] bg-black/60 backdrop-blur-md border border-white/10 p-5 text-white">
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-1.5 text-[#FFD600] text-xs font-bold">
													<Star size={12} fill="#FFD600" />
													{Math.min(
														5,
														(
															4.2 +
															(featuredDeal?.likedByCount || 0) / 60
														).toFixed(1),
													)}{" "}
													<span className="text-white/50 font-normal">
														({featuredDeal?.likedByCount || 0} likes)
													</span>
												</div>
												<div className="rounded-full bg-[#FFD600] px-2 py-0.5 text-[0.65rem] font-bold text-black">
													Live Deal
												</div>
											</div>

											<h3 className="text-lg font-bold mb-3">
												{featuredDeal?.title || "Studio Master H1"}
											</h3>

											<div className="flex items-end justify-between">
												<div>
													<div className="font-mono text-2xl font-bold text-[#FFD600] tracking-tight">
														{featuredDeal?.originalPrice || "₹450"}
													</div>
												</div>
												<div className="flex gap-2">
													<button
														type="button"
														onClick={() => moveTopDeals("prev")}
														className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition"
													>
														<ChevronLeft size={14} />
													</button>
													<Link
														to={`/listing/${featuredDeal?.productId || featuredDeal?.id || ""}`}
														className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition"
													>
														Grab Deal
													</Link>
													<button
														type="button"
														onClick={() => moveTopDeals("next")}
														className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition"
													>
														<ChevronRight size={14} />
													</button>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</section>

						{/* Premium Banner */}
						<section className="mt-8 flex items-center justify-between rounded-full bg-[#1A1A1A] px-6 py-4 text-white shadow-lg">
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333333]">
									<Zap size={16} className="text-[#FFD600] fill-[#FFD600]" />
								</div>
								<p className="text-[0.95rem]">
									<span className="font-bold">Deal Post Premium:</span>{" "}
									<span className="text-white/80">
										Boost your ads for 3x more views and faster sales.
									</span>
								</p>
							</div>
							<button className="rounded-full bg-[#333333] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#444444] transition hidden sm:block">
								Learn More
							</button>
						</section>

						{/* Fresh Recommendations */}
						<section className="mt-16">
							<div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
								<div>
									<h2 className="text-[2rem] font-bold text-black mb-2">
										Fresh recommendations
									</h2>
									<p className="flex items-center gap-1.5 text-sm font-semibold text-[#888888]">
										<MapPin size={14} /> Current location: Chennai
									</p>
								</div>
								<Link
									to="/explore"
									className="inline-flex items-center gap-1 text-sm font-bold text-black hover:text-[#FFD600] transition"
								>
									See all <ArrowRight size={16} />
								</Link>
							</div>

							{/* Reduced columns from 5 to 4 to make the cards significantly wider/larger on big screens */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
								{displayListings.map((item) => {
									const listingId = getListingNumericId(item);
									const compareId = item?.productId || item?.id;
									const compareSelected =
										selectedCompareIds.includes(compareId);
									const compareDisabled =
										selectedCompareIds.length > 0 &&
										item?.category !== selectedCompareCategory &&
										!compareSelected;
									const liked = isListingLiked(item, likedListingIds);
									const isLiking = Boolean(
										listingId && likingByListingId[listingId],
									);

									return (
										<Link
											key={item.id}
											to={`/listing/${item.productId || item.id}`}
											className="group flex flex-col rounded-[24px] bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#F0F2F5] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(40,40,90,0.1)]"
										>
											{/* Image Section - Adjusted Aspect Ratio from 4/3 to 4/5 for taller, larger images */}
											<div className="relative aspect-[4/5] w-full overflow-hidden rounded-[16px] bg-[#F4F5F7]">
												<img
													src={item.image}
													alt={item.title}
													className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
												/>

												<button
													type="button"
													onClick={(event) =>
														toggleCompareSelection(event, item)
													}
													disabled={compareDisabled}
													className={`ml-2 rounded-full border px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] transition ${compareSelected ? "border-black bg-black text-white" : "border-[#d8dbe2] bg-white text-[#1E1E38] hover:bg-[#f7f7f7]"} ${compareDisabled ? "cursor-not-allowed opacity-50" : ""}`}
												>
													{compareSelected ? "Selected" : "Compare"}
												</button>
												{/* Likes Badge */}
												<div className="absolute bottom-3 right-3 flex items-center rounded-lg bg-[#FFEBEB] px-2.5 py-1.5 shadow-sm">
													<Heart
														size={14}
														className="mx-1.5 fill-[#1E1E38] text-[#1E1E38]"
													/>
													<div className="mx-1.5 h-3.5 w-[1.5px] bg-[#1E1E38]/15"></div>

													{selectedCompareIds.length ? (
														<div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
															<div>
																<p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6A6A79]">
																	Compare Basket
																</p>
																<p className="mt-1 text-sm text-[#1E1E38]">
																	{selectedCompareIds.length} selected from
																	category:{" "}
																	{selectedCompareCategory || "General"}
																</p>
															</div>
															<div className="flex items-center gap-2">
																<button
																	type="button"
																	onClick={() => {
																		setSelectedCompareIds([]);
																		setSelectedCompareCategory("");
																	}}
																	className="rounded-full border border-[#d8dbe2] px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#1E1E38] hover:bg-[#f8f8f8]"
																>
																	Clear
																</button>
																<button
																	type="button"
																	onClick={() =>
																		launchCompareForDeals(
																			...selectedCompareDeals,
																		)
																	}
																	className="rounded-full bg-[#FFD600] px-5 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-black hover:bg-[#efc800]"
																>
																	Compare Selected
																</button>
															</div>
														</div>
													) : null}
													<span className="text-[0.9rem] font-medium text-[#1E1E38]/80">
														{item.likedByCount}
													</span>
												</div>
											</div>

											{/* Content Section */}
											<div className="flex flex-1 flex-col px-1 pt-4 pb-2">
												<div>
													<h3 className="text-[1.15rem] font-bold text-[#1E1E38] line-clamp-1">
														{item.title}
													</h3>
													<p className="mt-1 text-[0.95rem] font-medium text-[#8A8A9E] line-clamp-1">
														{item.category}
													</p>
												</div>

												<div className="my-4 h-px w-full bg-[#F0F2F5]"></div>

												<div className="mt-auto flex items-end justify-between">
													<div>
														<div className="flex items-baseline gap-2">
															<span className="text-[1.4rem] font-bold tracking-tight text-[#1E1E38] leading-none">
																{item.originalPrice}
															</span>
														</div>
													</div>

													<button
														type="button"
														onClick={(event) => onToggleLike(event, item)}
														disabled={isLiking}
														className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all shadow-md ${liked ? "bg-[#E64242] shadow-[#E64242]/25 hover:bg-[#cf3535]" : "bg-[#f5c518] shadow-[#f5c518]/25 hover:bg-[#dfb010]"} ${isLiking ? "opacity-70" : "hover:scale-105"}`}
													>
														<Heart
															size={20}
															className={
																liked ? "fill-white text-white" : "text-white"
															}
														/>
													</button>
												</div>
											</div>
										</Link>
									);
								})}
							</div>

							{!loading && !displayListings.length && (
								<div className="mt-6 rounded-2xl border border-[#EAEAEA] bg-white p-6 text-center text-sm text-[#777777]">
									No live listings found yet.
								</div>
							)}

							<div className="mt-12 text-center">
								<button className="rounded-full border border-[#EAEAEA] bg-white px-10 py-3.5 text-sm font-bold text-black hover:bg-[#F8F8F8] shadow-sm transition">
									Load More
								</button>
							</div>
						</section>

						{/* Top Deals For You - Carousel Section */}
						<section className="mt-16 rounded-[40px] bg-[#FFF9E6] p-8 md:p-14 relative overflow-hidden">
							<div className="flex items-center justify-between mb-10 relative z-10">
								<h2 className="flex items-center gap-3 text-[2rem] font-bold text-black">
									<Zap size={28} className="text-[#FFD600] fill-[#FFD600]" />
									Top Deals For You
								</h2>
								<div className="flex gap-3">
									<button
										type="button"
										onClick={() =>
											launchCompareForDeals(featuredDeal, leftDeal, rightDeal)
										}
										className="rounded-full border border-[#EAEAEA] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-black transition hover:bg-[#f8f8f8] justify-center flex items-center gap-1.5"
									>
										Compare
									</button>
									<button
										type="button"
										onClick={() => moveTopDeals("prev")}
										disabled={topDealsCount < 2}
										className="grid h-12 w-12 place-items-center rounded-full bg-white border border-[#EAEAEA] shadow-sm hover:scale-105 transition disabled:opacity-60"
									>
										<ChevronLeft size={20} />
									</button>
									<button
										type="button"
										onClick={() => moveTopDeals("next")}
										disabled={topDealsCount < 2}
										className="grid h-12 w-12 place-items-center rounded-full bg-white border border-[#EAEAEA] shadow-sm hover:scale-105 transition disabled:opacity-60"
									>
										<ChevronRight size={20} />
									</button>
								</div>
							</div>

							<div className="flex items-center justify-center gap-6 relative z-10 min-h-[400px]">
								{/* Left Faded Item */}
								<button
									type="button"
									onClick={() => moveTopDeals("prev")}
									className="hidden lg:block w-[280px] h-[280px] rounded-[32px] overflow-hidden opacity-60 scale-90 transition transform hover:opacity-100 hover:scale-95 cursor-pointer"
								>
									<img
										src={
											leftDeal?.image ||
											"https://placehold.co/600x600?text=Deal.Post"
										}
										className="w-full h-full object-cover"
										alt="Deal"
									/>
								</button>

								{/* Center Active Item */}
								<div
									key={`carousel-main-${topDealsIndex}-${slideDirection}`}
									className={`w-full max-w-[600px] h-[360px] rounded-[32px] bg-[#111111] overflow-hidden relative shadow-2xl group cursor-pointer ${slideDirection === "next" ? "deal-slide-next" : "deal-slide-prev"}`}
								>
									<img
										src={
											featuredDeal?.image ||
											"https://placehold.co/800x600?text=Deal.Post"
										}
										className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-700"
										alt="Main Deal"
									/>

									<div className="absolute inset-0 p-8 flex flex-col justify-between">
										<div className="flex justify-between items-start">
											<div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 text-white text-xs font-bold border border-white/10">
												<Clock size={12} /> 1H 45M
											</div>
											<div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 text-[#FFD600] text-xs font-bold border border-white/10">
												<Star size={12} fill="#FFD600" /> 4.7
											</div>
										</div>

										<div>
											<h3 className="text-white text-2xl font-bold mb-1">
												{featuredDeal?.title || "Featured Deal"}
											</h3>
											<div className="text-[3.5rem] font-bold text-white leading-none tracking-tighter mb-6">
												{featuredDeal?.originalPrice || "₹0"}
											</div>
											<div className="flex flex-wrap gap-3">
												<Link
													to={`/listing/${featuredDeal?.productId || featuredDeal?.id || ""}`}
													className="rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-8 py-3 text-sm font-bold text-white hover:bg-white/20 transition uppercase tracking-wider"
												>
													Grab Deal
												</Link>
												<button
													type="button"
													onClick={() =>
														launchCompareForDeals(featuredDeal, leftDeal, rightDeal)
													}
													className="rounded-full border border-[#FFD600]/80 bg-[#FFD600] px-8 py-3 text-sm font-bold text-black transition hover:bg-[#f2c700] uppercase tracking-wider"
												>
													Compare Now
												</button>
											</div>
										</div>
									</div>
								</div>

								{/* Right Faded Item */}
								<button
									type="button"
									onClick={() => moveTopDeals("next")}
									className="hidden md:block w-[280px] h-[280px] rounded-[32px] overflow-hidden opacity-60 scale-90 transition transform hover:opacity-100 hover:scale-95 cursor-pointer"
								>
									<img
										src={
											rightDeal?.image ||
											"https://placehold.co/600x600?text=Deal.Post"
										}
										className="w-full h-full object-cover"
										alt="Deal"
									/>
								</button>
							</div>
						</section>

						{/* Trending Text Section */}
						<section className="mt-20 mb-10 grid gap-8 md:grid-cols-3 border-t border-[#EAEAEA] pt-12">
							<div>
								<h4 className="text-lg font-bold text-black mb-4">
									Trending in Cars:
								</h4>
								<p className="text-[0.85rem] text-[#888888] leading-relaxed">
									Used Honda City, Toyota Fortuner for sale, Pre-owned BMW 3
									Series, Luxury SUVs in Chennai, Classic Vintage Cars, Electric
									Vehicles.
								</p>
							</div>
							<div>
								<h4 className="text-lg font-bold text-black mb-4">
									Trending in Tech:
								</h4>
								<p className="text-[0.85rem] text-[#888888] leading-relaxed">
									iPhone 15 Pro Max, PS5 Consoles, MacBook Air M1, Gaming
									Laptops, Mirrorless Cameras, Smart Home Devices, Mechanical
									Keyboards.
								</p>
							</div>
							<div>
								<h4 className="text-lg font-bold text-black mb-4">
									Trending in Living:
								</h4>
								<p className="text-[0.85rem] text-[#888888] leading-relaxed">
									Mid-century Modern Furniture, Persian Rugs, Minimalist Desks,
									Ergonomic Chairs, Indoor Plants, Abstract Art Prints, Luxury
									Bedding.
								</p>
							</div>
						</section>
					</div>

					<AdSidebar side="right" />
				</div>
			</main>

			<Footer />
		</div>
	);
}
