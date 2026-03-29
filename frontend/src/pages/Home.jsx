import {
	ArrowRight,
	Bike,
	BookOpen,
	Briefcase,
	Building2,
	Car,
	ChevronRight,
	Clock,
	Cpu,
	Dog,
	Drill,
	Gem,
	Heart,
	Home as HomeIcon,
	Laptop,
	MapPin,
	Shirt,
	Smartphone,
	Sofa,
	Star,
	Truck,
	Zap,
	ChevronLeft,
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

const CATEGORY_ICON_MAP = {
	Cars: Car,
	Bikes: Bike,
	Properties: Building2,
	"Electronics & Appliances": Laptop,
	Mobiles: Smartphone,
	"Commercial Vehicles & Spares": Truck,
	Jobs: Briefcase,
	Furniture: Sofa,
	Fashion: Shirt,
	Pets: Dog,
	"Books, Sports & Hobbies": BookOpen,
	Services: Drill,
};
const DEALS_PER_ROW_DESKTOP = 4;
const PROMO_EVERY_ROWS = 5;
const PROMO_INSERT_INTERVAL = DEALS_PER_ROW_DESKTOP * PROMO_EVERY_ROWS;
const DISPLAY_CATEGORIES = [
	"Cars",
	"Bikes",
	"Properties",
	"Electronics & Appliances",
	"Mobiles",
	"Commercial Vehicles & Spares",
	"Jobs",
	"Furniture",
	"Fashion",
	"Pets",
	"Books, Sports & Hobbies",
	"Services",
];

// Define your hero slider data
const HERO_SLIDES = [
	{
		id: 1,
		title: "Revamp Your Living Space",
		subtitle: "Discover premium furniture collections at unbeatable prices.",
		image:
			"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=2000",
		ctaText: "Explore Furniture",
		ctaLink: "/explore?category=Furniture",
	},
	{
		id: 2,
		title: "Find Your Dream Ride",
		subtitle: "Certified pre-owned vehicles with extended warranties.",
		image:
			"https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=2000",
		ctaText: "View Vehicles",
		ctaLink: "/explore?category=Vehicles",
	},
];

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

const getLocationLabel = (value) => {
	if (!value) return "Chennai";
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		return (
			value?.name || value?.label || value?.city || value?.district || "Chennai"
		);
	}
	return String(value);
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
		listingType: item?.listingType || "fixed",
		auction: item?.auction || null,
		startingBid: item?.startingBid || null,
		currentBid: item?.currentBid || null,
		location: getLocationLabel(
			item?.location || item?.city || item?.district || item?.seller?.location,
		),
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

export default function Home() {
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();
	const [search, setSearch] = useState("");
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [likedListingIds, setLikedListingIds] = useState([]);
	const [likingByListingId, setLikingByListingId] = useState({});
	const [topDealsIndex, setTopDealsIndex] = useState(0);
	const [slideDirection, setSlideDirection] = useState("next");

	// Hero Slider State
	const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

	// Fetch Data Effect
	useEffect(() => {
		const fetchHomeData = async () => {
			try {
				setLoading(true);
				const listingsRes = await api.get("/listings", {
					params: { limit: 40, sort: "Newest", search: search || undefined },
				});

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

	// Liked Items Effect
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

	// Hero Slider Auto-play Effect
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
		}, 6000); // Slide every 6 seconds
		return () => clearInterval(timer);
	}, []);

	const nextHeroSlide = () =>
		setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
	const prevHeroSlide = () =>
		setCurrentHeroSlide(
			(prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
		);

	const displayListings = listings.map(normalizeListing);
	const dealFeedItems = displayListings.flatMap((item, index) => {
		const next = [{ type: "deal", item, key: `deal-${item.id || index}` }];
		if ((index + 1) % PROMO_INSERT_INTERVAL === 0) {
			next.push({ type: "promo", key: `promo-${index}` });
		}
		return next;
	});
	const sidebarCategories = DISPLAY_CATEGORIES;
	const auctionHighlights = displayListings
		.filter(
			(listing) =>
				String(listing?.listingType || "").toLowerCase() === "auction",
		)
		.slice(0, 2);
	const categoryDeals = Object.entries(
		displayListings.reduce((acc, listing) => {
			const categoryName = listing?.category || "General";
			if (!acc[categoryName]) {
				acc[categoryName] = [];
			}
			if (acc[categoryName].length < 8) {
				acc[categoryName].push(listing);
			}
			return acc;
		}, {}),
	)
		.filter(([, rows]) => rows.length >= 2)
		.slice(0, 4);
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

	const formatAuctionEndsLabel = (value) => {
		if (!value) return "Ending soon";
		const endTime = new Date(value);
		if (Number.isNaN(endTime.getTime())) return "Ending soon";
		return `Ends ${endTime.toLocaleDateString()} ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
	};

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
				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
					<div className="min-w-0">
						{/* Categories Row */}
						<div className="top-20 z-20 -mx-2 mb-4 rounded-2xl bg-white/95 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-xl font-bold font-display">Categories</h2>
								<Link
									to="/categories"
									className="text-sm font-bold text-[#666666] hover:text-black transition-colors"
								>
									View All →
								</Link>
							</div>
							<section className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
								{sidebarCategories.map((catName, index) => {
									const Icon = CATEGORY_ICON_MAP[catName] || Cpu;
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
						</div>

						{/* Hero Section */}
						<section className="mt-4 relative w-full h-[220px] md:h-[260px] lg:h-[300px] rounded-[24px] md:rounded-[28px] overflow-hidden group shadow-lg">
							{/* Slides Container */}
							<div
								className="flex w-full h-full transition-transform duration-700 ease-in-out"
								style={{ transform: `translateX(-${currentHeroSlide * 100}%)` }}
							>
								{HERO_SLIDES.map((slide) => (
									<div
										key={slide.id}
										className="w-full h-full flex-shrink-0 relative"
									>
										<img
											src={slide.image}
											alt={slide.title}
											className="w-full h-full object-cover"
										/>
										{/* Gradient Overlay for better text readability */}
										<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-transparent flex flex-col justify-center px-6 md:px-10 lg:px-14">
											<div className="max-w-xl">
												<span className="inline-block py-1 px-3 rounded-full bg-[#FFD600] text-black text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
													Featured Event
												</span>
												<h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
													{slide.title}
												</h2>
												<p className="text-xs md:text-sm text-white/90 mb-5 font-medium max-w-md">
													{slide.subtitle}
												</p>
												<Link
													to={slide.ctaLink}
													className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs md:text-sm hover:bg-[#FFD600] transition-colors shadow-md group/btn"
												>
													{slide.ctaText}
													<ArrowRight
														size={18}
														className="group-hover/btn:translate-x-1 transition-transform"
													/>
												</Link>
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Navigation Arrows */}
							<button
								type="button"
								onClick={prevHeroSlide}
								className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
							>
								<ChevronLeft size={20} />
							</button>
							<button
								type="button"
								onClick={nextHeroSlide}
								className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
							>
								<ChevronRight size={20} />
							</button>

							{/* Pagination Dots */}
							<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
								{HERO_SLIDES.map((_, index) => (
									<button
										key={index}
										type="button"
										onClick={() => setCurrentHeroSlide(index)}
										className={`transition-all duration-300 rounded-full ${
											currentHeroSlide === index
												? "w-8 h-2.5 bg-[#FFD600]"
												: "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
										}`}
										aria-label={`Go to slide ${index + 1}`}
									/>
								))}
							</div>

							{auctionHighlights.length > 0 && (
								<div className="absolute right-3 top-3 hidden max-w-[280px] rounded-2xl border border-white/20 bg-black/45 p-3 text-white backdrop-blur-md md:block">
									<div className="mb-2 flex items-center justify-between">
										<p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FFD600]">
											Live Auctions
										</p>
										<Link
											to="/explore?listingType=auction&sort=Auction%20Ending%20Soon"
											className="text-[10px] font-semibold text-white/80 hover:text-white"
										>
											View all
										</Link>
									</div>
									<div className="space-y-2">
										{auctionHighlights.map((auctionItem) => (
											<Link
												key={`hero-auction-${auctionItem.id}`}
												to={`/listing/${auctionItem.productId || auctionItem.id}`}
												className="block rounded-xl border border-white/15 bg-white/10 p-2 transition hover:bg-white/15"
											>
												<p className="line-clamp-1 text-xs font-semibold">
													{auctionItem.title}
												</p>
												<p className="mt-1 text-sm font-bold text-[#FFD600]">
													{formatPrice(
														auctionItem?.auction?.currentBid ||
															auctionItem?.currentBid ||
															auctionItem?.startingBid ||
															auctionItem?.price,
													)}
												</p>
												<p className="mt-1 line-clamp-1 text-[10px] text-white/80">
													{formatAuctionEndsLabel(
														auctionItem?.auction?.endsAt ||
															auctionItem?.auctionEndsAt,
													)}
												</p>
											</Link>
										))}
									</div>
								</div>
							)}
						</section>

						{/* Fresh Recommendations */}
						<section className="mt-10">
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
								{dealFeedItems.map((feedItem) => {
									if (feedItem.type === "promo") {
										return (
											<div
												key={feedItem.key}
												className="rounded-[18px] bg-[#3D73E9] p-6 text-white shadow-[0_16px_35px_rgba(61,115,233,0.35)]"
											>
												<h3 className="text-[1.9rem] font-bold leading-tight">
													Want to see your stuff here?
												</h3>
												<p className="mt-4 text-[1.05rem] text-white/90">
													Make some extra cash by selling things in your
													community. Go on, it is quick and easy.
												</p>
												<Link
													to="/post-ad"
													className="mt-8 inline-flex w-full justify-center rounded-xl border border-white/70 px-5 py-3 text-lg font-bold text-white transition hover:bg-white/15"
												>
													Start selling
												</Link>
											</div>
										);
									}

									const item = feedItem.item;
									const listingId = getListingNumericId(item);
									const liked = isListingLiked(item, likedListingIds);
									const isAuction =
										String(item?.listingType || "").toLowerCase() === "auction";
									const displayPrice = isAuction
										? formatPrice(
												item?.auction?.currentBid ||
													item?.currentBid ||
													item?.startingBid ||
													item?.price,
											)
										: item.originalPrice;
									const isLiking = Boolean(
										listingId && likingByListingId[listingId],
									);

									return (
										<Link
											key={feedItem.key}
											to={`/listing/${item.productId || item.id}`}
											className="group flex flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white transition hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
										>
											<div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F5F7]">
												<img
													src={item.image}
													alt={item.title}
													className="h-full w-full object-cover"
												/>
												<button
													type="button"
													onClick={(event) => onToggleLike(event, item)}
													disabled={isLiking}
													className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white text-[#111827] shadow-sm transition hover:bg-[#F7F7F7]"
												>
													<Heart
														size={24}
														className={
															liked
																? "fill-[#111827] text-[#111827]"
																: "text-[#111827]"
														}
													/>
												</button>
												{isAuction && (
													<div className="absolute left-3 top-3 rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
														Auction
													</div>
												)}
											</div>
											<div className="flex flex-1 flex-col p-4">
												<p className="text-[1.5rem] font-black tracking-tight text-[#08102A] leading-none">
													{displayPrice}
												</p>
												{isAuction && (
													<p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#8b7008]">
														Current bid
													</p>
												)}
												<p className="mt-2 line-clamp-1 text-[1rem] font-medium text-[#5C6678]">
													{item.title}
												</p>
												<div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem] font-medium uppercase tracking-[0.03em] text-[#778195]">
													<span className="line-clamp-1">{item.location}</span>
													<span className="shrink-0">{item.time}</span>
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

						{/* Category Deal Carousels */}
						{categoryDeals.length ? (
							<section className="mt-16 space-y-8">
								<div className="flex items-center justify-between">
									<h2 className="text-[1.8rem] font-bold text-black">
										Deals by category
									</h2>
									<Link
										to="/explore"
										className="inline-flex items-center gap-1 text-sm font-bold text-black hover:text-[#FFD600] transition"
									>
										Explore all <ArrowRight size={16} />
									</Link>
								</div>

								{categoryDeals.map(([categoryName, items]) => (
									<div key={categoryName}>
										<div className="mb-3 flex items-center justify-between">
											<h3 className="text-xl font-bold text-[#1E1E38]">
												{categoryName}
											</h3>
											<Link
												to={`/explore?category=${encodeURIComponent(categoryName)}`}
												className="text-xs font-bold uppercase tracking-[0.13em] text-[#666666] hover:text-black"
											>
												View category
											</Link>
										</div>
										<div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
											{items.map((item) => (
												<Link
													key={`cat-${categoryName}-${item.id}`}
													to={`/listing/${item.productId || item.id}`}
													className="min-w-[220px] max-w-[220px] rounded-2xl border border-[#EAEAEA] bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5"
												>
													<div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F3F3F3]">
														<img
															src={item.image}
															alt={item.title}
															className="h-full w-full object-cover"
														/>
													</div>
													<p className="mt-3 text-lg font-bold text-[#1E1E38]">
														{item.originalPrice}
													</p>
													<p className="mt-0.5 line-clamp-1 text-sm font-medium text-[#67677C]">
														{item.title}
													</p>
												</Link>
											))}
										</div>
									</div>
								))}
							</section>
						) : null}

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
											"https://placehold.co/600x600?text=Deal Post"
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
											"https://placehold.co/800x600?text=Deal Post"
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
														launchCompareForDeals(
															featuredDeal,
															leftDeal,
															rightDeal,
														)
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
											"https://placehold.co/600x600?text=Deal Post"
										}
										className="w-full h-full object-cover"
										alt="Deal"
									/>
								</button>
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
