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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdSidebar from "../components/ad-sidebar";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";
import {
	fetchOpenStreetSuggestions,
	getStoredLocationCoords,
	getStoredLocationLabel,
	hasValidCoordinates,
	LOCATION_UPDATED_EVENT,
	persistStoredLocation,
} from "../utils/locationHelpers";
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
const SECURITY_EVERY_MIN_ROWS = 5;
const SECURITY_EVERY_MAX_ROWS = 9;
const DEFAULT_LOCATION_RADIUS_KM = 50;
const LOCATION_RADIUS_OPTIONS_KM = [5, 10, 25, 50];
const LOCATION_RADIUS_EXPANSION_STEPS_KM = [5, 10, 25, 50, 75, 100, 150, 200];
const LOCATION_RADIUS_STORAGE_KEY = "homeLocationRadiusKm";
const HOME_LISTINGS_PAGE_SIZE = 40;
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

const MEGA_CATEGORY_ICON_MAP = {
	Electronics: Laptop,
	"Fashion & Beauty": Shirt,
	Sports: BookOpen,
	"Pet Supplies": Dog,
	"Food & Drinks": HomeIcon,
	"Health & Wellness": Heart,
	Vehicles: Truck,
	Property: Building2,
	Services: Drill,
	"Hospitals & Clinics": Heart,
	"Miscellaneous / Other (Extracted from middle/back)": Cpu,
};

const getMegaCategoryIcon = (categoryName) =>
	MEGA_CATEGORY_ICON_MAP[categoryName] ||
	CATEGORY_ICON_MAP[categoryName] ||
	Cpu;

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
	if (!value) return "Location unavailable";
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		return (
			value?.name ||
			value?.label ||
			value?.city ||
			value?.district ||
			"Location unavailable"
		);
	}
	return String(value);
};

const readStoredUserLocation = () => {
	const label = String(getStoredLocationLabel() || "").trim();
	const coords = getStoredLocationCoords();
	const hasCoords = hasValidCoordinates(coords?.lat, coords?.lng);

	return {
		label,
		lat: hasCoords ? Number(coords.lat) : null,
		lng: hasCoords ? Number(coords.lng) : null,
	};
};

const getStoredLocationRadius = () => {
	const raw = Number(localStorage.getItem(LOCATION_RADIUS_STORAGE_KEY));
	return LOCATION_RADIUS_OPTIONS_KM.includes(raw)
		? raw
		: DEFAULT_LOCATION_RADIUS_KM;
};

const getNextBroaderRadiusKm = (currentRadiusKm) =>
	LOCATION_RADIUS_EXPANSION_STEPS_KM.find(
		(radiusKm) => radiusKm > Number(currentRadiusKm || 0),
	) || null;

const normalizeListing = (item) => {
	const id = item?._id || item?.id;
	const numericPrice = Number(item?.price || 15006);

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
	const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
	const [allCategories, setAllCategories] = useState([]);
	const [userLocation, setUserLocation] = useState(readStoredUserLocation);
	const [locationRadiusKm] = useState(getStoredLocationRadius);
	const [loadMoreRadiusKm, setLoadMoreRadiusKm] = useState(
		getStoredLocationRadius,
	);
	const [currentPage, setCurrentPage] = useState(1);
	const [hasMoreListings, setHasMoreListings] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const categoryMenuRef = useRef(null);
	const geocodedLocationCacheRef = useRef(new Map());

	// Hero Slider State
	const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

	// Fetch Data Effect
	useEffect(() => {
		const syncLocation = () => {
			setUserLocation(readStoredUserLocation());
		};

		window.addEventListener(LOCATION_UPDATED_EVENT, syncLocation);
		window.addEventListener("focus", syncLocation);

		return () => {
			window.removeEventListener(LOCATION_UPDATED_EVENT, syncLocation);
			window.removeEventListener("focus", syncLocation);
		};
	}, []);

	useEffect(() => {
		localStorage.setItem(LOCATION_RADIUS_STORAGE_KEY, String(locationRadiusKm));
	}, [locationRadiusKm]);

	useEffect(() => {
		setLoadMoreRadiusKm(locationRadiusKm);
		setCurrentPage(1);
		setHasMoreListings(true);
	}, [
		search,
		locationRadiusKm,
		userLocation.label,
		userLocation.lat,
		userLocation.lng,
	]);

	const resolveLocationCoordinates = useCallback(async () => {
		let locationCoords = {
			lat: userLocation.lat,
			lng: userLocation.lng,
		};
		const locationLabel = String(userLocation.label || "").trim();

		if (
			!hasValidCoordinates(locationCoords.lat, locationCoords.lng) &&
			locationLabel.length >= 3
		) {
			const cachedCoords = geocodedLocationCacheRef.current.get(locationLabel);
			if (cachedCoords) {
				locationCoords = cachedCoords;
			} else {
				const suggestions = await fetchOpenStreetSuggestions(locationLabel, {
					limit: 1,
				});
				const firstMatch = suggestions[0];
				if (firstMatch && hasValidCoordinates(firstMatch.lat, firstMatch.lng)) {
					locationCoords = {
						lat: Number(firstMatch.lat),
						lng: Number(firstMatch.lng),
					};
					geocodedLocationCacheRef.current.set(locationLabel, locationCoords);

					persistStoredLocation({
						location: locationLabel,
						lat: locationCoords.lat,
						lng: locationCoords.lng,
					});
					setUserLocation((prev) => ({
						...prev,
						lat: locationCoords.lat,
						lng: locationCoords.lng,
					}));
				}
			}
		}

		return locationCoords;
	}, [userLocation.label, userLocation.lat, userLocation.lng]);

	const fetchHomeListingsPage = useCallback(
		async ({ page, radiusKm }) => {
			const locationCoords = await resolveLocationCoordinates();
			const hasLocationFilter =
				Number.isFinite(locationCoords.lat) &&
				Number.isFinite(locationCoords.lng);

			const listingsRes = await api.get("/listings", {
				params: {
					limit: HOME_LISTINGS_PAGE_SIZE,
					page,
					sort: "Newest",
					search: search || undefined,
					radius: hasLocationFilter ? `${radiusKm}km` : undefined,
					originLat: hasLocationFilter ? locationCoords.lat : undefined,
					originLng: hasLocationFilter ? locationCoords.lng : undefined,
				},
			});

			const listingRows = pickArray(listingsRes?.data, [
				"listings",
				"items",
				"data",
			]);
			const totalPages = Number(listingsRes?.data?.pages);

			return {
				listingRows,
				totalPages,
				hasLocationFilter,
			};
		},
		[resolveLocationCoordinates, search],
	);

	useEffect(() => {
		let active = true;

		const fetchHomeData = async () => {
			try {
				setLoading(true);
				const { listingRows, totalPages } = await fetchHomeListingsPage({
					page: 1,
					radiusKm: locationRadiusKm,
				});

				if (!active) return;

				setListings(listingRows);
				setCurrentPage(1);
				if (Number.isFinite(totalPages) && totalPages > 0) {
					setHasMoreListings(1 < totalPages);
				} else {
					setHasMoreListings(listingRows.length >= HOME_LISTINGS_PAGE_SIZE);
				}
			} catch {
				if (active) {
					toast.error("Could not load homepage data");
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		fetchHomeData();

		return () => {
			active = false;
		};
	}, [
		search,
		fetchHomeListingsPage,
		locationRadiusKm,
		userLocation.label,
		userLocation.lat,
		userLocation.lng,
	]);

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

	useEffect(() => {
		let active = true;

		const fetchCategories = async () => {
			try {
				const { data } = await api.get("/categories");
				const rows = pickArray(data, ["categories", "data", "items"]);
				if (!active) return;
				setAllCategories(Array.isArray(rows) ? rows : []);
			} catch {
				if (active) {
					setAllCategories([]);
				}
			}
		};

		fetchCategories();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!isMegaMenuOpen) return undefined;

		const handleOutsideClick = (event) => {
			if (!categoryMenuRef.current?.contains(event.target)) {
				setIsMegaMenuOpen(false);
			}
		};

		const handleEscape = (event) => {
			if (event.key === "Escape") {
				setIsMegaMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isMegaMenuOpen]);

	const nextHeroSlide = () =>
		setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
	const prevHeroSlide = () =>
		setCurrentHeroSlide(
			(prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
		);

	const onHeroSliderKeyDown = (event) => {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			nextHeroSlide();
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			prevHeroSlide();
		}
	};

	const displayListings = listings.map(normalizeListing);
	const dealFeedItems = useMemo(() => {
		const next = [];
		let seed = displayListings.length || 1;
		const nextSeed = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296;
			return seed;
		};
		const randomRowsBetween = () => {
			const range = SECURITY_EVERY_MAX_ROWS - SECURITY_EVERY_MIN_ROWS + 1;
			return SECURITY_EVERY_MIN_ROWS + (nextSeed() % range);
		};

		let nextSecurityRow = randomRowsBetween();

		displayListings.forEach((item, index) => {
			next.push({ type: "deal", item, key: `deal-${item.id || index}` });

			if ((index + 1) % PROMO_INSERT_INTERVAL === 0) {
				next.push({ type: "promo", key: `promo-${index}` });
			}

			if ((index + 1) % DEALS_PER_ROW_DESKTOP === 0) {
				const completedRows = (index + 1) / DEALS_PER_ROW_DESKTOP;
				if (completedRows >= nextSecurityRow) {
					next.push({
						type: "security",
						key: `security-${index}`,
					});
					nextSecurityRow += randomRowsBetween();
				}
			}
		});

		return next;
	}, [displayListings]);
	const sidebarCategories = DISPLAY_CATEGORIES;
	const megaMenuSections = useMemo(() => {
		const grouped = new Map();

		for (const raw of allCategories) {
			const rawLabel = String(raw?.name || raw || "").trim();
			if (!rawLabel || /funeral/i.test(rawLabel)) continue;

			const parts = rawLabel
				.split(">")
				.map((entry) => entry.trim())
				.filter(Boolean);
			if (parts.length < 2) continue;

			const mainCategory = parts[0];
			if (/funeral/i.test(mainCategory)) continue;
			const groupLabel = parts[1];
			const leafLabel = parts.slice(2).join(" > ");

			if (!grouped.has(mainCategory)) {
				grouped.set(mainCategory, new Map());
			}

			const mainGroups = grouped.get(mainCategory);
			if (!mainGroups.has(groupLabel)) {
				mainGroups.set(groupLabel, new Set());
			}

			if (leafLabel) {
				mainGroups.get(groupLabel).add(leafLabel);
			}
		}

		const ranked = Array.from(grouped.entries())
			.map(([title, groupMap]) => {
				const groups = Array.from(groupMap.entries())
					.map(([label, itemSet]) => ({
						label,
						items: Array.from(itemSet).sort((a, b) => a.localeCompare(b)),
					}))
					.sort((a, b) => {
						if (b.items.length !== a.items.length) {
							return b.items.length - a.items.length;
						}
						return a.label.localeCompare(b.label);
					});

				const childCount = groups.reduce(
					(sum, group) => sum + Math.max(group.items.length, 1),
					0,
				);

				return {
					title,
					groups,
					childCount,
				};
			})
			.filter((section) => section.childCount > 0)
			.sort((a, b) => {
				if (b.childCount !== a.childCount) {
					return b.childCount - a.childCount;
				}
				return a.title.localeCompare(b.title);
			});

		return ranked.slice(0, 8);
	}, [allCategories]);

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
	const currentLocationLabel = userLocation.label || "All locations";

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

	const launchCompareForTopDeal = (deal) => {
		const compareId = deal?.productId || deal?.id;
		if (!compareId) {
			toast.error("Unable to start comparison for this product");
			return;
		}

		navigate(`/compare?seed=${encodeURIComponent(compareId)}`);
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

	const onTopDealsKeyDown = (event) => {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			moveTopDeals("next");
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			moveTopDeals("prev");
		}
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

	const mergeUniqueListings = (existingRows, incomingRows) => {
		const seen = new Set(
			existingRows
				.map((row) => row?._id || row?.id || row?.productId)
				.filter(Boolean),
		);

		const additions = incomingRows.filter((row) => {
			const key = row?._id || row?.id || row?.productId;
			if (!key || seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		return [...existingRows, ...additions];
	};

	const onLoadMoreListings = async () => {
		if (loading || isLoadingMore) return;

		setIsLoadingMore(true);

		try {
			let nextPage = currentPage + 1;
			let targetRadiusKm = loadMoreRadiusKm;
			let loadedRows = [];
			let hasLocationFilter = false;
			let totalPages = 0;

			while (true) {
				const result = await fetchHomeListingsPage({
					page: nextPage,
					radiusKm: targetRadiusKm,
				});

				loadedRows = result.listingRows;
				hasLocationFilter = result.hasLocationFilter;
				totalPages = result.totalPages;

				if (loadedRows.length > 0) {
					break;
				}

				if (!hasLocationFilter) {
					setHasMoreListings(false);
					toast("No more listings available right now");
					return;
				}

				const broaderRadiusKm = getNextBroaderRadiusKm(targetRadiusKm);
				if (!broaderRadiusKm) {
					setHasMoreListings(false);
					toast("No more nearby listings found");
					return;
				}

				targetRadiusKm = broaderRadiusKm;
				nextPage = 1;
			}

			setListings((prev) => mergeUniqueListings(prev, loadedRows));
			setCurrentPage(nextPage);
			setLoadMoreRadiusKm(targetRadiusKm);

			if (Number.isFinite(totalPages) && totalPages > 0) {
				setHasMoreListings(nextPage < totalPages);
			} else {
				setHasMoreListings(loadedRows.length >= HOME_LISTINGS_PAGE_SIZE);
			}

			if (targetRadiusKm > loadMoreRadiusKm) {
				toast.success(
					`Expanded search radius to ${targetRadiusKm} km for more nearby listings`,
				);
			}
		} catch {
			toast.error("Could not load more listings");
		} finally {
			setIsLoadingMore(false);
		}
	};

	return (
		<div className="min-h-screen bg-white font-sans text-black flex flex-col">
			{/* Navbar would go here, assuming it's imported and handles its own layout */}
			<Navbar showSearch search={search} onSearchChange={setSearch} />

			<main
				id="main-content"
				className="mx-auto w-full max-w-[1780px] px-4 py-6 sm:px-6 lg:px-8 flex-1"
			>
				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
					<div className="min-w-0">
						{/* Categories Row */}
						<div
							ref={categoryMenuRef}
							onMouseLeave={() => setIsMegaMenuOpen(false)}
							className="top-20 z-20 -mx-2 mb-4 rounded-2xl bg-white/95 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80"
							aria-label="Browse categories"
						>
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-xl font-bold font-display">Categories</h2>
								<Link
									to="/categories"
									className="text-sm font-bold text-[#666666] hover:text-black transition-colors"
								>
									View All &rarr;
								</Link>
							</div>
							<section
								className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
								aria-label="Top categories"
							>
								<button
									type="button"
									onMouseEnter={() => setIsMegaMenuOpen(true)}
									onFocus={() => setIsMegaMenuOpen(true)}
									aria-expanded={isMegaMenuOpen}
									aria-controls="home-mega-category-panel"
									className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
										isMegaMenuOpen
											? "bg-[#1677ff] text-white shadow-sm"
											: "bg-[#F8F8F8] text-[#666666] hover:bg-[#F0F0F0]"
									}`}
								>
									<ChevronRight
										size={16}
										className={`transition-transform ${isMegaMenuOpen ? "rotate-90" : ""}`}
									/>
									All Category
								</button>
								{sidebarCategories.map((catName, index) => {
									const Icon = CATEGORY_ICON_MAP[catName] || Cpu;
									const active = index === 0 && !isMegaMenuOpen;
									return (
										<Link
											key={catName || index}
											onClick={() => setIsMegaMenuOpen(false)}
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

							{isMegaMenuOpen && (
								<div
									id="home-mega-category-panel"
									className="mt-3 rounded-[26px] border border-[#E8E8E8] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.14)]"
								>
									<div className="mb-4 flex items-center justify-between">
										<p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1677ff]">
											All Categories
										</p>
										<Link
											onClick={() => setIsMegaMenuOpen(false)}
											to="/categories"
											className="text-xs font-bold uppercase tracking-[0.13em] text-[#5f5f5f] hover:text-black"
										>
											View full directory
										</Link>
									</div>

									{megaMenuSections.length ? (
										<div className="max-h-[460px] overflow-y-auto pr-1">
											<div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
												{megaMenuSections.map((section) => {
													const TitleIcon = getMegaCategoryIcon(section.title);
													return (
														<div key={section.title}>
															<Link
																onClick={() => setIsMegaMenuOpen(false)}
																to={`/explore?category=${encodeURIComponent(section.title)}`}
																className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-[#171717] hover:text-[#1677ff]"
															>
																<TitleIcon size={15} />
																{section.title}
																<span className="rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[10px] font-bold text-[#1677ff]">
																	{section.childCount}
																</span>
															</Link>
															<div className="space-y-1.5">
																{section.groups.slice(0, 6).map((group) => (
																	<div
																		key={`${section.title}-${group.label}`}
																		className="group rounded-lg border border-[#EAEAEA] bg-[#FAFAFA] px-2 py-1"
																	>
																		<div className="text-[13px] font-semibold text-[#555]">
																			<div className="flex items-center justify-between gap-2">
																				<span
																					className="truncate"
																					title={group.label}
																				>
																					{group.label}
																				</span>
																				<span className="shrink-0 text-[10px] font-bold text-[#777]">
																					{group.items.length || 1}
																				</span>
																			</div>
																		</div>
																		<div className="mt-1 hidden space-y-1 pl-1 group-hover:block group-focus-within:block">
																			{group.items.length ? (
																				group.items
																					.slice(0, 6)
																					.map((itemLabel) => (
																						<Link
																							key={`${section.title}-${group.label}-${itemLabel}`}
																							onClick={() =>
																								setIsMegaMenuOpen(false)
																							}
																							to={`/explore?category=${encodeURIComponent(`${section.title} > ${group.label} > ${itemLabel}`)}`}
																							className="block text-[12px] text-[#666666] hover:text-black"
																							title={itemLabel}
																						>
																							{itemLabel}
																						</Link>
																					))
																			) : (
																				<Link
																					onClick={() =>
																						setIsMegaMenuOpen(false)
																					}
																					to={`/explore?category=${encodeURIComponent(`${section.title} > ${group.label}`)}`}
																					className="block text-[12px] text-[#666666] hover:text-black"
																					title={group.label}
																				>
																					Browse {group.label}
																				</Link>
																			)}
																		</div>
																	</div>
																))}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									) : (
										<div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] p-4 text-sm text-[#666666]">
											Categories are loading. Please try again.
										</div>
									)}
								</div>
							)}
						</div>

						{/* Hero Section */}
						<section
							className="mt-4 relative w-full h-[220px] md:h-[260px] lg:h-[300px] rounded-[24px] md:rounded-[28px] overflow-hidden group shadow-lg"
							aria-label="Featured promotions"
							onKeyDown={onHeroSliderKeyDown}
							tabIndex={0}
							role="region"
							aria-roledescription="carousel"
							aria-live="polite"
						>
							{/* Slides Container */}
							<div
								className="flex w-full h-full transition-transform duration-700 ease-in-out"
								style={{ transform: `translateX(-${currentHeroSlide * 100}%)` }}
							>
								{HERO_SLIDES.map((slide, index) => (
									<div
										key={slide.id}
										className="w-full h-full flex-shrink-0 relative"
										aria-hidden={currentHeroSlide !== index}
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
								aria-label="Previous featured slide"
								className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
							>
								<ChevronLeft size={20} />
							</button>
							<button
								type="button"
								onClick={nextHeroSlide}
								aria-label="Next featured slide"
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
						<section
							className="mt-10"
							aria-labelledby="home-fresh-recommendations-heading"
						>
							<div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
								<div>
									<h2
										id="home-fresh-recommendations-heading"
										className="text-[2rem] font-bold text-black mb-2"
									>
										Fresh recommendations
									</h2>
									<p className="flex items-center gap-1.5 text-sm font-semibold text-[#888888]">
										<MapPin size={14} /> Current location:{" "}
										{currentLocationLabel}
									</p>
								</div>
								<Link
									to="/explore"
									className="inline-flex items-center gap-1 text-sm font-bold text-black hover:text-[#FFD600] transition"
								>
									See all <ArrowRight size={16} />
								</Link>
							</div>

							<div
								className="grid grid-cols-2 items-start gap-3 sm:gap-6 md:[grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr))]"
								aria-label="Fresh recommendation listings"
							>
								{dealFeedItems.map((feedItem) => {
									if (feedItem.type === "promo") {
										return (
											<div
												key={feedItem.key}
												className="col-span-2 self-start rounded-[18px] bg-[#3D73E9] p-4 text-white shadow-[0_16px_35px_rgba(61,115,233,0.35)] sm:col-span-1 sm:p-6"
											>
												<h3 className="text-[1.5rem] font-bold leading-[1.08] sm:text-[1.9rem] sm:leading-tight">
													Want to see your stuff here?
												</h3>
												<p className="mt-3 text-[0.92rem] text-white/90 sm:mt-4 sm:text-[1rem]">
													Make some extra cash by selling things in your
													community. Go on, it is quick and easy.
												</p>
												<Link
													to="/post-ad"
													className="mt-5 inline-flex w-full justify-center rounded-xl border border-white/70 px-5 py-3 text-base font-bold text-white transition hover:bg-white/15 sm:mt-8 sm:text-lg"
												>
													Start selling
												</Link>
											</div>
										);
									}

									if (feedItem.type === "security") {
										return (
											<div
												key={feedItem.key}
												className="col-span-2 self-start rounded-2xl border border-[#D9E7FF] bg-[#F5F9FF] p-4 sm:col-span-1"
											>
												<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2a57b6]">
													Security Note
												</p>
												<p className="mt-2 text-sm font-semibold text-[#1E2D52]">
													Your data is encrypted and safe with us.
												</p>
												<p className="mt-1 text-xs text-[#4c5f87]">
													We use secure storage and controlled access for
													account information.
												</p>
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
										: item.price;
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
													aria-label={
														liked ? "Remove from favorites" : "Add to favorites"
													}
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
												<p className="text-[1.15rem] font-black tracking-tight text-[#08102A] leading-none sm:text-[1.5rem]">
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

							{hasMoreListings ? (
								<div className="mt-12 text-center">
									<button
										type="button"
										onClick={onLoadMoreListings}
										disabled={loading || isLoadingMore}
										className="rounded-full border border-[#EAEAEA] bg-white px-10 py-3.5 text-sm font-bold text-black hover:bg-[#F8F8F8] shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
									>
										{isLoadingMore ? "Loading..." : "Load More"}
									</button>
								</div>
							) : null}
						</section>

						{/* Category Deal Carousels */}
						{categoryDeals.length ? (
							<section
								className="mt-16 space-y-8"
								aria-labelledby="home-category-deals-heading"
							>
								<div className="flex items-center justify-between">
									<h2
										id="home-category-deals-heading"
										className="text-[1.8rem] font-bold text-black"
									>
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
														{item.price}
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
						<section
							className="mt-12 rounded-[28px] bg-[#FFF9E6] p-4 md:p-5 relative overflow-hidden"
							aria-labelledby="home-top-deals-heading"
							tabIndex={0}
							onKeyDown={onTopDealsKeyDown}
							role="region"
							aria-roledescription="carousel"
						>
							<div className="flex items-center justify-between mb-4 relative z-10">
								<h2
									id="home-top-deals-heading"
									className="flex items-center gap-2 text-[1.25rem] font-bold text-black"
								>
									<Zap size={28} className="text-[#FFD600] fill-[#FFD600]" />
									Top Deals For You
								</h2>
								<div className="flex gap-3">
									<button
										type="button"
										onClick={() => launchCompareForTopDeal(featuredDeal)}
										className="rounded-full border border-[#EAEAEA] bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:bg-[#f8f8f8] justify-center flex items-center gap-1"
									>
										Compare
									</button>
									<button
										type="button"
										onClick={() => moveTopDeals("prev")}
										disabled={topDealsCount < 2}
										className="grid h-9 w-9 place-items-center rounded-full bg-white border border-[#EAEAEA] shadow-sm hover:scale-105 transition disabled:opacity-60"
									>
										<ChevronLeft size={17} />
									</button>
									<button
										type="button"
										onClick={() => moveTopDeals("next")}
										disabled={topDealsCount < 2}
										className="grid h-9 w-9 place-items-center rounded-full bg-white border border-[#EAEAEA] shadow-sm hover:scale-105 transition disabled:opacity-60"
									>
										<ChevronRight size={17} />
									</button>
								</div>
							</div>

							<div className="flex items-center justify-center gap-3 relative z-10 min-h-[260px]">
								{/* Left Faded Item */}
								<button
									type="button"
									onClick={() => moveTopDeals("prev")}
									className="hidden lg:block w-[170px] h-[170px] rounded-[20px] overflow-hidden opacity-60 scale-90 transition transform hover:opacity-100 hover:scale-95 cursor-pointer"
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
									className={`w-full max-w-[440px] h-[240px] rounded-[20px] bg-[#111111] overflow-hidden relative shadow-2xl group cursor-pointer ${slideDirection === "next" ? "deal-slide-next" : "deal-slide-prev"}`}
								>
									<img
										src={
											featuredDeal?.image ||
											"https://placehold.co/800x600?text=Deal Post"
										}
										className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-700"
										alt="Main Deal"
									/>

									<div className="absolute inset-0 p-4 flex flex-col justify-between">
										<div className="flex justify-between items-start">
											<div className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-white text-[10px] font-bold border border-white/10">
												<Clock size={12} /> 1H 45M
											</div>
											<div className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[#FFD600] text-[10px] font-bold border border-white/10">
												<Star size={12} fill="#FFD600" /> 4.7
											</div>
										</div>

										<div>
											<h3 className="text-white text-lg font-bold mb-1 line-clamp-1">
												{featuredDeal?.title || "Featured Deal"}
											</h3>
											<div className="text-[2rem] font-bold text-white leading-none tracking-tighter mb-3">
												{featuredDeal?.price || "₹0"}
											</div>
											<div className="flex flex-wrap gap-2">
												<Link
													to={`/listing/${featuredDeal?.productId || featuredDeal?.id || ""}`}
													className="rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-5 py-2 text-[10px] font-bold text-white hover:bg-white/20 transition uppercase tracking-wider"
												>
													Grab Deal
												</Link>
												<button
													type="button"
													onClick={() => launchCompareForTopDeal(featuredDeal)}
													className="rounded-full border border-[#FFD600]/80 bg-[#FFD600] px-5 py-2 text-[10px] font-bold text-black transition hover:bg-[#f2c700] uppercase tracking-wider"
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
									className="hidden md:block w-[170px] h-[170px] rounded-[20px] overflow-hidden opacity-60 scale-90 transition transform hover:opacity-100 hover:scale-95 cursor-pointer"
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

							<div className="relative z-10 mt-4 grid gap-2.5 md:grid-cols-2">
								<div className="h-[74px] rounded-xl border border-dashed border-[#DCCB87] bg-white/70 px-3 flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b7a3a]">
									Horizontal Ad Slot
								</div>
								<div className="h-[74px] rounded-xl border border-dashed border-[#DCCB87] bg-white/70 px-3 flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b7a3a]">
									Horizontal Ad Slot
								</div>
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
