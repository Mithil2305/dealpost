import { Check, ChevronDown, ChevronRight, Filter, Heart } from "lucide-react";
import {
	Suspense,
	lazy,
	useDeferredValue,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Button from "../components/ui/Button";
import DealGrid from "../components/ui/DealGrid";
import FeedSkeleton from "../components/ui/FeedSkeleton.jsx";
import ResponsiveImage from "../components/ui/ResponsiveImage.jsx";
import SearchBar from "../components/ui/SearchBar";
import { pickArray } from "../utils/api";
import { getStoredLocationCoords } from "../utils/locationHelpers";

const Modal = lazy(() => import("../components/ui/Modal.jsx"));

const CATEGORIES_CACHE_KEY = "dealpost:explore:categories:v1";
const LISTING_CACHE_TTL_MS = 12000;
const listingRequestsInFlight = new Map();
const listingResponseCache = new Map();
let categoriesRequestPromise = null;

const buildListingRequestKey = (params) => {
	const query = new URLSearchParams();
	Object.entries(params || {}).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") return;
		query.set(key, String(value));
	});
	return query.toString();
};

const fetchListingsDedupe = async (params) => {
	const key = buildListingRequestKey(params);
	const now = Date.now();
	const cached = listingResponseCache.get(key);
	if (cached && now - cached.ts < LISTING_CACHE_TTL_MS) {
		return cached.data;
	}

	const active = listingRequestsInFlight.get(key);
	if (active) {
		return active;
	}

	const request = api
		.get("/listings", { params })
		.then((response) => {
			listingResponseCache.set(key, { ts: Date.now(), data: response.data });
			return response.data;
		})
		.finally(() => {
			listingRequestsInFlight.delete(key);
		});

	listingRequestsInFlight.set(key, request);
	return request;
};

const defaultFilters = {
	category: [],
	listingType: "",
	minPrice: "",
	maxPrice: "",
	condition: "",
	radius: "25",
	sort: "Newest",
};

const parseCategoryParam = (value) =>
	String(value || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

const isRateLimitedError = (error) => Number(error?.response?.status) === 429;

const areSameArrays = (a, b) =>
	a.length === b.length && a.every((item, index) => item === b[index]);

const getMainCategory = (value) => {
	if (!value) return "";
	return String(value).split(">")[0]?.trim() || "";
};

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

export default function Explore() {
	const [searchParams, setSearchParams] = useSearchParams();
	const queryString = searchParams.toString();
	const [categories, setCategories] = useState([]);
	const [pendingFilters, setPendingFilters] = useState(() => ({
		...defaultFilters,
		category: parseCategoryParam(searchParams.get("category")),
		listingType: searchParams.get("listingType") || defaultFilters.listingType,
		sort: searchParams.get("sort") || defaultFilters.sort,
	}));
	const [appliedFilters, setAppliedFilters] = useState(() => ({
		...defaultFilters,
		category: parseCategoryParam(searchParams.get("category")),
		listingType: searchParams.get("listingType") || defaultFilters.listingType,
		sort: searchParams.get("sort") || defaultFilters.sort,
	}));
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const deferredSearch = useDeferredValue(search);
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [showFilters, setShowFilters] = useState(false);
	const [expandedMainCategory, setExpandedMainCategory] = useState("");
	const [expandedSubCategoryGroups, setExpandedSubCategoryGroups] = useState(
		{},
	);
	const mainCategoryRefs = useRef({});
	const [selectedCoords, setSelectedCoords] = useState(getStoredLocationCoords);

	useEffect(() => {
		let active = true;

		const fetchCategories = async () => {
			try {
				const cached = sessionStorage.getItem(CATEGORIES_CACHE_KEY);
				if (cached) {
					const parsed = JSON.parse(cached);
					if (Array.isArray(parsed)) {
						setCategories(parsed);
						return;
					}
				}

				if (!categoriesRequestPromise) {
					categoriesRequestPromise = api
						.get("/categories")
						.then((response) => response.data)
						.finally(() => {
							categoriesRequestPromise = null;
						});
				}

				const data = await categoriesRequestPromise;
				const rows = pickArray(data, ["categories", "data", "items"]);
				if (active) {
					setCategories(rows);
				}
				sessionStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(rows));
			} catch (error) {
				if (active && !isRateLimitedError(error)) {
					toast.error("Failed to load filters");
				}
			}
		};

		fetchCategories();

		return () => {
			active = false;
		};
	}, []);

	useLayoutEffect(() => {
		const parsedParams = new URLSearchParams(queryString);
		const nextSearch = parsedParams.get("search") || "";
		const nextSort = parsedParams.get("sort") || defaultFilters.sort;
		const nextListingType =
			parsedParams.get("listingType") || defaultFilters.listingType;
		const nextCategory = parseCategoryParam(parsedParams.get("category"));

		setSearch((prev) => (prev === nextSearch ? prev : nextSearch));
		setAppliedFilters((prev) => {
			if (
				prev.sort === nextSort &&
				prev.listingType === nextListingType &&
				areSameArrays(prev.category, nextCategory)
			) {
				return prev;
			}

			return {
				...prev,
				sort: nextSort,
				listingType: nextListingType,
				category: nextCategory,
			};
		});
		setPendingFilters((prev) => {
			if (
				prev.sort === nextSort &&
				prev.listingType === nextListingType &&
				areSameArrays(prev.category, nextCategory)
			) {
				return prev;
			}

			return {
				...prev,
				sort: nextSort,
				listingType: nextListingType,
				category: nextCategory,
			};
		});
		setPage(1);
	}, [queryString]);

	const urlStateQuery = useMemo(() => {
		const nextParams = new URLSearchParams();
		if (deferredSearch.trim()) {
			nextParams.set("search", deferredSearch.trim());
		}
		if (appliedFilters.sort && appliedFilters.sort !== defaultFilters.sort) {
			nextParams.set("sort", appliedFilters.sort);
		}
		if (appliedFilters.listingType) {
			nextParams.set("listingType", appliedFilters.listingType);
		}
		if (appliedFilters.category.length) {
			nextParams.set("category", appliedFilters.category.join(","));
		}
		return nextParams.toString();
	}, [
		deferredSearch,
		appliedFilters.sort,
		appliedFilters.listingType,
		appliedFilters.category,
	]);

	useEffect(() => {
		// Normalize: parse both into sorted key=value pairs for comparison
		const normalize = (qs) => {
			const params = new URLSearchParams(qs);
			return [...params.entries()]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => `${k}=${v}`)
				.join("&");
		};

		if (normalize(urlStateQuery) !== normalize(queryString)) {
			setSearchParams(new URLSearchParams(urlStateQuery), { replace: true });
		}
	}, [urlStateQuery, queryString, setSearchParams]);

	useEffect(() => {
		const syncSelectedLocation = () => {
			setSelectedCoords(getStoredLocationCoords());
		};

		syncSelectedLocation();
		window.addEventListener("dealpost:location-changed", syncSelectedLocation);

		return () => {
			window.removeEventListener(
				"dealpost:location-changed",
				syncSelectedLocation,
			);
		};
	}, []);

	useEffect(() => {
		let active = true;

		const fetchResults = async () => {
			try {
				setLoading(true);
				const params = {
					category: appliedFilters.category.join(",") || undefined,
					listingType: appliedFilters.listingType || undefined,
					minPrice: appliedFilters.minPrice || undefined,
					maxPrice: appliedFilters.maxPrice || undefined,
					condition: appliedFilters.condition || undefined,
					radius: appliedFilters.radius
						? `${appliedFilters.radius}km`
						: undefined,
					originLat: Number.isFinite(selectedCoords.lat)
						? selectedCoords.lat
						: undefined,
					originLng: Number.isFinite(selectedCoords.lng)
						? selectedCoords.lng
						: undefined,
					sort: appliedFilters.sort || undefined,
					search: deferredSearch || undefined,
					page,
				};

				const data = await fetchListingsDedupe(params);
				const next = pickArray(data, ["listings", "items", "data"]);
				const totalPages = Number(data?.pages);
				if (!active) return;
				setResults((prev) => (page === 1 ? next : [...prev, ...next]));
				if (Number.isFinite(totalPages) && totalPages > 0) {
					setHasMore(page < totalPages);
				} else {
					setHasMore(next.length > 0);
				}
			} catch (error) {
				if (active && !isRateLimitedError(error)) {
					toast.error("Unable to fetch listings");
				}
				if (active && page === 1) {
					setHasMore(false);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		fetchResults();

		return () => {
			active = false;
		};
	}, [
		appliedFilters,
		deferredSearch,
		page,
		selectedCoords.lat,
		selectedCoords.lng,
	]);

	const hasFilters = useMemo(
		() =>
			Boolean(
				appliedFilters.category.length ||
				appliedFilters.listingType ||
				appliedFilters.minPrice ||
				appliedFilters.maxPrice ||
				appliedFilters.condition,
			),
		[appliedFilters],
	);

	const mainCategoryOptions = useMemo(
		() =>
			Array.from(
				new Set(
					categories
						.map((category) => getMainCategory(category?.name || category))
						.filter(Boolean),
				),
			),
		[categories],
	);

	const subCategoryGroupsByMain = useMemo(() => {
		const grouped = new Map();

		for (const rawCategory of categories) {
			const fullPath = String(rawCategory?.name || rawCategory || "").trim();
			if (!fullPath) continue;

			const parts = fullPath
				.split(">")
				.map((part) => part.trim())
				.filter(Boolean);
			if (parts.length < 2) continue;

			const main = parts[0];
			const groupLabel = parts[1];
			const groupValue = `${main} > ${groupLabel}`;

			if (!grouped.has(main)) {
				grouped.set(main, new Map());
			}

			const mainGroupMap = grouped.get(main);
			if (!mainGroupMap.has(groupValue)) {
				mainGroupMap.set(groupValue, {
					label: groupLabel,
					value: groupValue,
					items: new Map(),
				});
			}

			if (parts.length > 2) {
				const leafLabel = parts.slice(2).join(" > ");
				mainGroupMap.get(groupValue).items.set(fullPath, {
					value: fullPath,
					label: leafLabel,
				});
			}
		}

		return new Map(
			Array.from(grouped.entries()).map(([main, groupMap]) => {
				const groups = Array.from(groupMap.values())
					.map((group) => ({
						label: group.label,
						value: group.value,
						items: Array.from(group.items.values()).sort((a, b) =>
							a.label.localeCompare(b.label),
						),
					}))
					.sort((a, b) => a.label.localeCompare(b.label));

				return [main, groups];
			}),
		);
	}, [categories]);

	useEffect(() => {
		if (!mainCategoryOptions.length) {
			setExpandedMainCategory("");
			return;
		}

		const selectedMainCategory = pendingFilters.category
			.map((value) => getMainCategory(value))
			.find((value) => mainCategoryOptions.includes(value));

		setExpandedMainCategory((prev) => {
			if (selectedMainCategory) return selectedMainCategory;
			if (prev && mainCategoryOptions.includes(prev)) return prev;
			return mainCategoryOptions[0];
		});
	}, [mainCategoryOptions, pendingFilters.category]);

	useEffect(() => {
		if (!mainCategoryOptions.length) return;

		const selectedMainCategory = pendingFilters.category
			.map((value) => getMainCategory(value))
			.find((value) => mainCategoryOptions.includes(value));
		const targetMainCategory = selectedMainCategory || expandedMainCategory;
		if (!targetMainCategory) return;

		const rafId = window.requestAnimationFrame(() => {
			const targetNode = mainCategoryRefs.current[targetMainCategory];
			if (!targetNode) return;

			const scrollContainer = targetNode.parentElement;
			if (!scrollContainer) return;

			const containerRect = scrollContainer.getBoundingClientRect();
			const targetRect = targetNode.getBoundingClientRect();
			const isFullyVisible =
				targetRect.top >= containerRect.top &&
				targetRect.bottom <= containerRect.bottom;

			if (!isFullyVisible) {
				targetNode.scrollIntoView({
					block: "nearest",
					behavior: "auto",
				});
			}
		});

		return () => {
			window.cancelAnimationFrame(rafId);
		};
	}, [pendingFilters.category, expandedMainCategory, mainCategoryOptions]);

	const toggleArrayFilter = (key, value) => {
		setPendingFilters((prev) => ({
			...prev,
			[key]: prev[key].includes(value)
				? prev[key].filter((item) => item !== value)
				: [...prev[key], value],
		}));
	};

	const applyPendingFilters = () => {
		setPage(1);
		setAppliedFilters((prev) => {
			if (
				prev.sort === pendingFilters.sort &&
				prev.listingType === pendingFilters.listingType &&
				prev.minPrice === pendingFilters.minPrice &&
				prev.maxPrice === pendingFilters.maxPrice &&
				prev.condition === pendingFilters.condition &&
				prev.radius === pendingFilters.radius &&
				areSameArrays(prev.category, pendingFilters.category)
			) {
				return prev;
			}

			return {
				...pendingFilters,
				category: [...pendingFilters.category],
			};
		});
	};

	const toggleSubCategoryGroupExpanded = (groupValue) => {
		setExpandedSubCategoryGroups((prev) => ({
			...prev,
			[groupValue]: !prev[groupValue],
		}));
	};

	useEffect(() => {
		if (!pendingFilters.category.length) return;

		setExpandedSubCategoryGroups((prev) => {
			const next = { ...prev };
			let changed = false;

			for (const selectedValue of pendingFilters.category) {
				const parts = String(selectedValue)
					.split(">")
					.map((part) => part.trim())
					.filter(Boolean);

				if (parts.length < 3) continue;

				const groupValue = `${parts[0]} > ${parts[1]}`;
				if (!next[groupValue]) {
					next[groupValue] = true;
					changed = true;
				}
			}

			return changed ? next : prev;
		});
	}, [pendingFilters.category]);

	return (
		<>
			<div className="min-h-[100dvh] bg-brand-bg flex flex-col">
				<Navbar
					showSearch
					search={search}
					onSearchChange={(value) => {
						setSearch(value);
						setPage(1);
					}}
				/>

				<main
					id="main-content"
					className="mr-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-6 flex-1"
				>
					<div className="mb-4 flex items-center justify-between lg:hidden">
						<h1 className="text-3xl font-display font-bold">Explore</h1>
						<Button
							variant="outline"
							size="md"
							onClick={() => setShowFilters(true)}
							className="rounded-full"
						>
							<Filter size={16} /> Filters
						</Button>
					</div>

					<Suspense fallback={null}>
						<Modal
							isOpen={showFilters}
							onClose={() => setShowFilters(false)}
							title="Filters"
							size="lg"
						>
							<div className="space-y-4 lg:hidden">
							<div className="mb-2 flex items-center justify-between">
								<p className="text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Main Category
								</p>
								{pendingFilters.category.length > 0 && (
									<button
										type="button"
										onClick={() => {
											setPendingFilters((prev) => ({ ...prev, category: [] }));
										}}
										className="text-[11px] font-semibold text-[#8b7008] hover:text-[#6f5805]"
									>
										Clear
									</button>
								)}
							</div>
							<div className="rounded-2xl border border-brand-border bg-[#FAFAFA] p-2.5">
								<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
									{mainCategoryOptions.map((label) => {
										const selected = pendingFilters.category.includes(label);
										const groups = subCategoryGroupsByMain.get(label) || [];
										const showSubItems = expandedMainCategory === label;
										const childCount = groups.reduce(
											(sum, group) => sum + Math.max(group.items.length, 1),
											0,
										);
										return (
											<div key={label} className="rounded-xl">
												<div
													className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${
														selected
															? "border-[#FFD600] bg-[#FFF7D6] text-black"
															: "border-transparent bg-white text-brand-dark hover:border-brand-border"
													}`}
												>
													<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
														<input
															type="checkbox"
															checked={selected}
															onChange={() =>
																toggleArrayFilter("category", label)
															}
															className="sr-only"
														/>
														<span
															className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border ${
																selected
																	? "border-[#111111] bg-[#111111] text-white"
																	: "border-[#D5D5D5] bg-white text-transparent"
															}`}
														>
															<Check size={12} />
														</span>
														<span className="line-clamp-1">{label}</span>
													</label>
													{!!groups.length && (
														<button
															type="button"
															onClick={() =>
																setExpandedMainCategory((prev) =>
																	prev === label ? "" : label,
																)
															}
															className="grid h-7 w-7 place-items-center rounded-md border border-brand-border bg-white text-[#6F6F6F] hover:text-black"
															aria-label={`Toggle ${label} subcategories`}
															aria-expanded={showSubItems}
														>
															{showSubItems ? (
																<ChevronDown size={14} />
															) : (
																<ChevronRight size={14} />
															)}
														</button>
													)}
												</div>

												{!!groups.length && showSubItems && (
													<div className="mt-1.5 rounded-xl border border-brand-border bg-white p-1.5">
														<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
															Subcategories ({childCount})
														</p>
														<div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
															{groups.map((group) => {
																const isGroupSelected =
																	pendingFilters.category.includes(group.value);
																const hasLeafItems = group.items.length > 0;
																const isGroupExpanded = Boolean(
																	expandedSubCategoryGroups[group.value],
																);

																return (
																	<div
																		key={group.value}
																		className="rounded-lg border border-[#E7E7E7] bg-[#FCFCFC] px-2 py-1.5"
																	>
																		<div className="flex items-center gap-2">
																			<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
																				<input
																					type="checkbox"
																					checked={isGroupSelected}
																					onChange={() =>
																						toggleArrayFilter(
																							"category",
																							group.value,
																						)
																					}
																					className="sr-only"
																				/>
																				<span
																					className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border ${isGroupSelected ? "border-[#111111] bg-[#111111] text-white" : "border-[#D5D5D5] bg-white text-transparent"}`}
																				>
																					<Check size={10} />
																				</span>
																				<span className="line-clamp-2 text-xs font-medium leading-snug text-brand-dark">
																					{group.label}
																				</span>
																			</label>
																			{hasLeafItems && (
																				<button
																					type="button"
																					onClick={() =>
																						toggleSubCategoryGroupExpanded(
																							group.value,
																						)
																					}
																					className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-brand-border bg-white text-[#6F6F6F] hover:text-black"
																					aria-label={`Toggle ${group.label} items`}
																					aria-expanded={isGroupExpanded}
																				>
																					{isGroupExpanded ? (
																						<ChevronDown size={13} />
																					) : (
																						<ChevronRight size={13} />
																					)}
																				</button>
																			)}
																		</div>

																		{hasLeafItems && isGroupExpanded && (
																			<div className="mt-1 space-y-1 pl-1">
																				{group.items.map((option) => {
																					const isSubSelected =
																						pendingFilters.category.includes(
																							option.value,
																						);
																					return (
																						<label
																							key={option.value}
																							className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${
																								isSubSelected
																									? "border-[#FFD600] bg-[#FFF7D6] text-black"
																									: "border-transparent bg-white text-brand-dark hover:border-brand-border"
																							}`}
																						>
																							<input
																								type="checkbox"
																								checked={isSubSelected}
																								onChange={() =>
																									toggleArrayFilter(
																										"category",
																										option.value,
																									)
																								}
																								className="sr-only"
																							/>
																							<span
																								className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border ${isSubSelected ? "border-[#111111] bg-[#111111] text-white" : "border-[#D5D5D5] bg-white text-transparent"}`}
																							>
																								<Check size={10} />
																							</span>
																							<span className="break-words leading-snug">
																								{option.label}
																							</span>
																						</label>
																					);
																				})}
																			</div>
																		)}
																	</div>
																);
															})}
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>

							<div>
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Listing Type
								</p>
								<select
									className="input-shell"
									value={pendingFilters.listingType}
									onChange={(event) =>
										setPendingFilters((prev) => ({
											...prev,
											listingType: event.target.value,
										}))
									}
								>
									<option value="">All Listings</option>
									<option value="fixed">Fixed Price</option>
									<option value="auction">Auctions</option>
								</select>
							</div>

							<div>
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Price Range
								</p>
								<div className="grid grid-cols-2 gap-2">
									<input
										className="input-shell"
										placeholder="Min"
										value={pendingFilters.minPrice}
										onChange={(event) =>
											setPendingFilters((prev) => ({
												...prev,
												minPrice: event.target.value,
											}))
										}
									/>
									<input
										className="input-shell"
										placeholder="Max"
										value={pendingFilters.maxPrice}
										onChange={(event) =>
											setPendingFilters((prev) => ({
												...prev,
												maxPrice: event.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div>
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Condition
								</p>
								{["New", "Used"].map((value) => (
									<label
										key={value}
										className="mb-1 flex items-center gap-2 text-sm"
									>
										<input
											type="radio"
											name="condition-mobile"
											checked={pendingFilters.condition === value}
											onChange={() =>
												setPendingFilters((prev) => ({
													...prev,
													condition: value,
												}))
											}
										/>
										{value}
									</label>
								))}
							</div>

							<div>
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Location Radius
								</p>
								<input
									type="range"
									min="5"
									max="100"
									step="5"
									value={Number(pendingFilters.radius) || 25}
									onChange={(event) =>
										setPendingFilters((prev) => ({
											...prev,
											radius: event.target.value,
										}))
									}
									className="w-full accent-[#D6AE00]"
								/>
								<div className="mt-2 flex items-center justify-between text-[11px] text-brand-muted">
									<span>5 km</span>
									<span className="font-semibold text-brand-dark">
										{Number(pendingFilters.radius) || 25} km
									</span>
									<span>100 km</span>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<Button
									variant="outline"
									onClick={() => {
										setPendingFilters(defaultFilters);
									}}
								>
									Clear All
								</Button>
								<Button
									onClick={() => {
										applyPendingFilters();
										setShowFilters(false);
									}}
								>
									Apply
								</Button>
							</div>
							</div>
						</Modal>
					</Suspense>

					<div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
						<aside className="hidden rounded-3xl border border-brand-border bg-white p-5 lg:block">
							<div className="mb-5 flex items-center justify-between">
								<h2 className="text-2xl font-display font-bold">Filters</h2>
								<button
									type="button"
									onClick={() => {
										setPendingFilters(defaultFilters);
									}}
									className="text-xs font-semibold text-[#8b7008]"
								>
									Clear All
								</button>
							</div>

							<div className="space-y-5">
								<div>
									<div className="mb-2 flex items-center justify-between">
										<p className="text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
											Main Category
										</p>
										{pendingFilters.category.length > 0 && (
											<button
												type="button"
												onClick={() => {
													setPendingFilters((prev) => ({
														...prev,
														category: [],
													}));
												}}
												className="text-[11px] font-semibold text-[#8b7008] hover:text-[#6f5805]"
											>
												Clear
											</button>
										)}
									</div>
									<div className="rounded-2xl border border-brand-border bg-[#FAFAFA] p-2.5">
										<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
											{mainCategoryOptions.map((label) => {
												const selected =
													pendingFilters.category.includes(label);
												const groups = subCategoryGroupsByMain.get(label) || [];
												const showSubItems = expandedMainCategory === label;
												const childCount = groups.reduce(
													(sum, group) => sum + Math.max(group.items.length, 1),
													0,
												);
												return (
													<div
														key={label}
														className="rounded-xl"
														ref={(node) => {
															mainCategoryRefs.current[label] = node;
														}}
													>
														<div
															className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${
																selected
																	? "border-[#FFD600] bg-[#FFF7D6] text-black"
																	: "border-transparent bg-white text-brand-dark hover:border-brand-border"
															}`}
														>
															<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
																<input
																	type="checkbox"
																	checked={selected}
																	onChange={() =>
																		toggleArrayFilter("category", label)
																	}
																	className="sr-only"
																/>
																<span
																	className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border ${
																		selected
																			? "border-[#111111] bg-[#111111] text-white"
																			: "border-[#D5D5D5] bg-white text-transparent"
																	}`}
																>
																	<Check size={12} />
																</span>
																<span className="line-clamp-1">{label}</span>
															</label>
															{!!groups.length && (
																<>
																	<span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-[#7A7A7A]">
																		{childCount}
																	</span>
																	<button
																		type="button"
																		onClick={() =>
																			setExpandedMainCategory((prev) =>
																				prev === label ? "" : label,
																			)
																		}
																		className="grid h-6 w-6 place-items-center rounded-md border border-brand-border bg-white text-[#6F6F6F] hover:text-black"
																		aria-label={`Toggle ${label} subcategories`}
																		aria-expanded={showSubItems}
																	>
																		{showSubItems ? (
																			<ChevronDown size={14} />
																		) : (
																			<ChevronRight size={14} />
																		)}
																	</button>
																</>
															)}
														</div>

														{!!groups.length && (
															<div
																className={`overflow-hidden transition-all duration-300 ${
																	showSubItems
																		? "mt-1.5 max-h-80 opacity-100"
																		: "max-h-0 opacity-0"
																}`}
															>
																<div className="rounded-xl border border-brand-border bg-white p-1.5">
																	<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
																		Subcategories ({childCount})
																	</p>
																	<div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
																		{groups.map((group) => {
																			const isGroupSelected =
																				pendingFilters.category.includes(
																					group.value,
																				);
																			const hasLeafItems =
																				group.items.length > 0;
																			const isGroupExpanded = Boolean(
																				expandedSubCategoryGroups[group.value],
																			);

																			return (
																				<div
																					key={group.value}
																					className="rounded-lg border border-[#E7E7E7] bg-[#FCFCFC] px-2 py-1.5"
																				>
																					<div className="flex items-center gap-2">
																						<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
																							<input
																								type="checkbox"
																								checked={isGroupSelected}
																								onChange={() =>
																									toggleArrayFilter(
																										"category",
																										group.value,
																									)
																								}
																								className="sr-only"
																							/>
																							<span
																								className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border ${isGroupSelected ? "border-[#111111] bg-[#111111] text-white" : "border-[#D5D5D5] bg-white text-transparent"}`}
																							>
																								<Check size={10} />
																							</span>
																							<span className="line-clamp-2 text-xs font-medium leading-snug text-brand-dark">
																								{group.label}
																							</span>
																						</label>
																						{hasLeafItems && (
																							<button
																								type="button"
																								onClick={() =>
																									toggleSubCategoryGroupExpanded(
																										group.value,
																									)
																								}
																								className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-brand-border bg-white text-[#6F6F6F] hover:text-black"
																								aria-label={`Toggle ${group.label} items`}
																								aria-expanded={isGroupExpanded}
																							>
																								{isGroupExpanded ? (
																									<ChevronDown size={13} />
																								) : (
																									<ChevronRight size={13} />
																								)}
																							</button>
																						)}
																					</div>

																					{hasLeafItems && isGroupExpanded && (
																						<div className="mt-1 space-y-1 pl-1">
																							{group.items.map((option) => {
																								const isSubSelected =
																									pendingFilters.category.includes(
																										option.value,
																									);
																								return (
																									<label
																										key={option.value}
																										className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${
																											isSubSelected
																												? "border-[#FFD600] bg-[#FFF7D6] text-black"
																												: "border-transparent bg-white text-brand-dark hover:border-brand-border"
																										}`}
																									>
																										<input
																											type="checkbox"
																											checked={isSubSelected}
																											onChange={() =>
																												toggleArrayFilter(
																													"category",
																													option.value,
																												)
																											}
																											className="sr-only"
																										/>
																										<span
																											className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border ${
																												isSubSelected
																													? "border-[#111111] bg-[#111111] text-white"
																													: "border-[#D5D5D5] bg-white text-transparent"
																											}`}
																										>
																											<Check size={10} />
																										</span>
																										<span className="break-words leading-snug">
																											{option.label}
																										</span>
																									</label>
																								);
																							})}
																						</div>
																					)}
																				</div>
																			);
																		})}
																	</div>
																</div>
															</div>
														)}
													</div>
												);
											})}
										</div>
									</div>
									<p className="mt-2 text-[11px] text-brand-muted">
										Use the arrow button to expand and collapse subcategories.
									</p>
								</div>

								<div>
									<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
										Listing Type
									</p>
									<select
										className="input-shell"
										value={pendingFilters.listingType}
										onChange={(event) =>
											setPendingFilters((prev) => ({
												...prev,
												listingType: event.target.value,
											}))
										}
									>
										<option value="">All Listings</option>
										<option value="fixed">Fixed Price</option>
										<option value="auction">Auctions</option>
									</select>
								</div>

								<div>
									<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
										Price Range
									</p>
									<div className="grid grid-cols-2 gap-2">
										<input
											className="input-shell"
											placeholder="Min"
											value={pendingFilters.minPrice}
											onChange={(event) =>
												setPendingFilters((prev) => ({
													...prev,
													minPrice: event.target.value,
												}))
											}
										/>
										<input
											className="input-shell"
											placeholder="Max"
											value={pendingFilters.maxPrice}
											onChange={(event) =>
												setPendingFilters((prev) => ({
													...prev,
													maxPrice: event.target.value,
												}))
											}
										/>
									</div>
								</div>

								<div>
									<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
										Condition
									</p>
									{["New", "Used"].map((value) => (
										<label
											key={value}
											className="mb-1 flex items-center gap-2 text-sm"
										>
											<input
												type="radio"
												name="condition"
												checked={pendingFilters.condition === value}
												onChange={() =>
													setPendingFilters((prev) => ({
														...prev,
														condition: value,
													}))
												}
											/>
											{value}
										</label>
									))}
								</div>

								<div>
									<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
										Location Radius
									</p>
									<input
										type="range"
										min="5"
										max="100"
										step="5"
										value={Number(pendingFilters.radius) || 25}
										onChange={(event) =>
											setPendingFilters((prev) => ({
												...prev,
												radius: event.target.value,
											}))
										}
										className="w-full accent-[#D6AE00]"
									/>
									<div className="mt-2 flex items-center justify-between text-[11px] text-brand-muted">
										<span>5 km</span>
										<span className="font-semibold text-brand-dark">
											{Number(pendingFilters.radius) || 25} km
										</span>
										<span>100 km</span>
									</div>
								</div>

								<button
									className="btn-primary h-12 w-full rounded-xl"
									type="button"
									onClick={applyPendingFilters}
								>
									Apply Filters
								</button>
							</div>
						</aside>

						<section>
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
								<SearchBar
									className="sm:flex-1"
									value={search}
									onChange={(value) => {
										setSearch(value);
										setPage(1);
									}}
									placeholder="Search listings"
								/>

								<select
									className="h-12 rounded-xl border border-brand-border bg-white px-3 text-sm sm:w-[170px]"
									value={appliedFilters.sort}
									onChange={(event) => {
										setPage(1);
										setPendingFilters((prev) => ({
											...prev,
											sort: event.target.value,
										}));
										setAppliedFilters((prev) => ({
											...prev,
											sort: event.target.value,
										}));
									}}
								>
									<option>Newest</option>
									<option>Auction Ending Soon</option>
									<option>Price Low-High</option>
									<option>Price High-Low</option>
									<option>Most Popular</option>
								</select>
							</div>

							<p
								className="mb-4 min-h-[20px] text-sm text-brand-muted"
								aria-live="polite"
							>
								Showing {results.length} results
								{deferredSearch ? ` for "${deferredSearch}"` : ""}
								{hasFilters ? " with active filters" : ""}
							</p>

							{loading && page === 1 ? (
								<FeedSkeleton count={6} minCardWidth={240} />
							) : results.length ? (
								<>
									<DealGrid minCardWidth={250}>
										{results.map((listing) =>
											(() => {
												const listingId = listing?._id || listing?.id;
												const detailId = listing?.productId || listingId;
												const image =
													listing?.images?.[0]?.url ||
													listing?.image ||
													"https://placehold.co/600x600?text=Deal Post";
												const isAuction =
													String(listing?.listingType || "").toLowerCase() ===
													"auction";
												const displayPrice = isAuction
													? formatPrice(
															listing?.auction?.currentBid ||
																listing?.currentBid ||
																listing?.startingBid ||
																listing?.price,
														)
													: formatPrice(listing?.price);

												const locationLabel = getLocationLabel(
													listing?.location ||
														listing?.city ||
														listing?.district ||
														listing?.seller?.location,
												);

												return (
													<Link
														key={listingId || detailId}
														to={`/listing/${detailId}`}
														className="group flex flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white transition hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
													>
														<div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F5F7]">
															<ResponsiveImage
																src={image}
																alt={listing?.title || "Listing image"}
																width={600}
																height={450}
																sizes="(min-width: 768px) 250px, 50vw"
																className="h-full w-full object-cover"
																onError={(event) => {
																	event.currentTarget.src =
																		"https://placehold.co/600x600?text=Deal Post";
																}}
															/>
															<div className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white text-[#111827] shadow-sm">
																<Heart size={24} className="text-[#111827]" />
															</div>

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
																{listing?.title || "Untitled Listing"}
															</p>
															<div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem] font-medium uppercase tracking-[0.03em] text-[#778195]">
																<span className="line-clamp-1">
																	{locationLabel}
																</span>
																<span className="shrink-0">
																	{timeAgo(listing?.createdAt)}
																</span>
															</div>
														</div>
													</Link>
												);
											})(),
										)}
									</DealGrid>

									{hasMore ? (
										<div className="mt-7 flex justify-center">
											<button
												type="button"
												onClick={() => setPage((prev) => prev + 1)}
												disabled={loading}
												className="rounded-full border border-brand-border bg-white px-8 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-60"
											>
												{loading && page > 1 ? "Loading..." : "Load more"}
											</button>
										</div>
									) : null}
								</>
							) : (
								<div className="deal-card grid h-72 place-items-center text-brand-muted">
									No listings match your filters yet.
								</div>
							)}
						</section>
					</div>
				</main>
				<Footer />
			</div>
		</>
	);
}
