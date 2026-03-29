import { Check, ChevronDown, ChevronRight, Filter, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import { pickArray } from "../utils/api";

const defaultFilters = {
	category: [],
	listingType: "",
	minPrice: "",
	maxPrice: "",
	condition: "",
	sellerType: [],
	radius: "25km",
	sort: "Newest",
};

const parseCategoryParam = (value) =>
	String(value || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

const areSameArrays = (a, b) =>
	a.length === b.length && a.every((item, index) => item === b[index]);

const getMainCategory = (value) => {
	if (!value) return "";
	return String(value).split(">")[0]?.trim() || "";
};

const getSubCategoryPath = (value) => {
	if (!value) return "";
	const parts = String(value)
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length < 2) return "";
	return parts.slice(1).join(" > ");
};

const getStoredLocationCoords = () => {
	try {
		const raw = sessionStorage.getItem("selectedLocationCoords");
		if (!raw) return { lat: null, lng: null };
		const parsed = JSON.parse(raw);
		const lat = Number(parsed?.lat);
		const lng = Number(parsed?.lng);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			return { lat: null, lng: null };
		}
		return { lat, lng };
	} catch {
		return { lat: null, lng: null };
	}
};

const getStoredLocationLabel = () =>
	localStorage.getItem("selectedLocation") || "";

export default function Explore() {
	const [searchParams, setSearchParams] = useSearchParams();
	const queryString = searchParams.toString();
	const [categories, setCategories] = useState([]);
	const [filters, setFilters] = useState(() => ({
		...defaultFilters,
		category: parseCategoryParam(searchParams.get("category")),
		listingType: searchParams.get("listingType") || defaultFilters.listingType,
		sort: searchParams.get("sort") || defaultFilters.sort,
	}));
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [showFilters, setShowFilters] = useState(false);
	const [expandedMainCategory, setExpandedMainCategory] = useState("");
	const mainCategoryRefs = useRef({});
	const [selectedCoords, setSelectedCoords] = useState(getStoredLocationCoords);
	const [selectedLocationLabel, setSelectedLocationLabel] = useState(
		getStoredLocationLabel,
	);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const { data } = await api.get("/categories");
				setCategories(pickArray(data, ["categories", "data", "items"]));
			} catch {
				toast.error("Failed to load filters");
			}
		};

		fetchCategories();
	}, []);

	useEffect(() => {
		const parsedParams = new URLSearchParams(queryString);
		const nextSearch = parsedParams.get("search") || "";
		const nextSort = parsedParams.get("sort") || defaultFilters.sort;
		const nextListingType =
			parsedParams.get("listingType") || defaultFilters.listingType;
		const nextCategory = parseCategoryParam(parsedParams.get("category"));

		setSearch((prev) => (prev === nextSearch ? prev : nextSearch));
		setFilters((prev) => {
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
		if (search.trim()) {
			nextParams.set("search", search.trim());
		}
		if (filters.sort && filters.sort !== defaultFilters.sort) {
			nextParams.set("sort", filters.sort);
		}
		if (filters.listingType) {
			nextParams.set("listingType", filters.listingType);
		}
		if (filters.category.length) {
			nextParams.set("category", filters.category.join(","));
		}
		return nextParams.toString();
	}, [search, filters.sort, filters.listingType, filters.category]);

	useEffect(() => {
		if (urlStateQuery !== queryString) {
			setSearchParams(new URLSearchParams(urlStateQuery), { replace: true });
		}
	}, [urlStateQuery, queryString, setSearchParams]);

	useEffect(() => {
		const syncSelectedLocation = () => {
			setSelectedCoords(getStoredLocationCoords());
			setSelectedLocationLabel(getStoredLocationLabel());
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
		const fetchResults = async () => {
			try {
				setLoading(true);
				const params = {
					category: filters.category.join(",") || undefined,
					listingType: filters.listingType || undefined,
					minPrice: filters.minPrice || undefined,
					maxPrice: filters.maxPrice || undefined,
					condition: filters.condition || undefined,
					radius: filters.radius || undefined,
					originLat: Number.isFinite(selectedCoords.lat)
						? selectedCoords.lat
						: undefined,
					originLng: Number.isFinite(selectedCoords.lng)
						? selectedCoords.lng
						: undefined,
					sort: filters.sort || undefined,
					search: search || undefined,
					page,
				};

				const { data } = await api.get("/listings", { params });
				const next = pickArray(data, ["listings", "items", "data"]);
				setResults((prev) => (page === 1 ? next : [...prev, ...next]));
			} catch {
				toast.error("Unable to fetch listings");
			} finally {
				setLoading(false);
			}
		};

		fetchResults();
	}, [filters, search, page, selectedCoords.lat, selectedCoords.lng]);

	const hasFilters = useMemo(
		() =>
			Boolean(
				filters.category.length ||
				filters.listingType ||
				filters.minPrice ||
				filters.maxPrice ||
				filters.condition ||
				filters.sellerType.length,
			),
		[filters],
	);

	const hasGeoContext =
		Number.isFinite(selectedCoords.lat) && Number.isFinite(selectedCoords.lng);

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

	const subCategoriesByMain = useMemo(() => {
		const grouped = new Map();

		for (const rawCategory of categories) {
			const fullPath = String(rawCategory?.name || rawCategory || "").trim();
			if (!fullPath || !fullPath.includes(">")) continue;

			const main = getMainCategory(fullPath);
			const label = getSubCategoryPath(fullPath);
			if (!main || !label) continue;

			if (!grouped.has(main)) {
				grouped.set(main, []);
			}

			grouped.get(main).push({ value: fullPath, label });
		}

		for (const [main, items] of grouped.entries()) {
			const uniqueItems = Array.from(
				new Map(items.map((item) => [item.value, item])).values(),
			).sort((a, b) => a.label.localeCompare(b.label));
			grouped.set(main, uniqueItems);
		}

		return grouped;
	}, [categories]);

	useEffect(() => {
		if (!mainCategoryOptions.length) {
			setExpandedMainCategory("");
			return;
		}

		const selectedMainCategory = filters.category
			.map((value) => getMainCategory(value))
			.find((value) => mainCategoryOptions.includes(value));

		setExpandedMainCategory((prev) => {
			if (selectedMainCategory) return selectedMainCategory;
			if (prev && mainCategoryOptions.includes(prev)) return prev;
			return mainCategoryOptions[0];
		});
	}, [mainCategoryOptions, filters.category]);

	useEffect(() => {
		if (!mainCategoryOptions.length) return;

		const selectedMainCategory = filters.category
			.map((value) => getMainCategory(value))
			.find((value) => mainCategoryOptions.includes(value));
		const targetMain = selectedMainCategory || expandedMainCategory;
		if (!targetMain) return;

		mainCategoryRefs.current[targetMain]?.scrollIntoView({
			block: "nearest",
			behavior: "smooth",
		});
	}, [filters.category, expandedMainCategory, mainCategoryOptions]);

	const toggleArrayFilter = (key, value) => {
		setPage(1);
		setFilters((prev) => ({
			...prev,
			[key]: prev[key].includes(value)
				? prev[key].filter((item) => item !== value)
				: [...prev[key], value],
		}));
	};

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar
				showSearch
				search={search}
				onSearchChange={(value) => {
					setSearch(value);
					setPage(1);
				}}
			/>

			<main className="mr-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-6 flex-1">
				<div className="mb-4 flex items-center justify-between lg:hidden">
					<h1 className="text-3xl font-display font-bold">Explore</h1>
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2 text-sm"
						onClick={() => setShowFilters((prev) => !prev)}
					>
						<Filter size={16} /> Filters
					</button>
				</div>

				<div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
					<aside
						className={`${showFilters ? "block" : "hidden"} rounded-3xl border border-brand-border bg-white p-5 lg:block`}
					>
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-2xl font-display font-bold">Filters</h2>
							<button
								type="button"
								onClick={() => {
									setFilters(defaultFilters);
									setPage(1);
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
									{filters.category.length > 0 && (
										<button
											type="button"
											onClick={() => {
												setPage(1);
												setFilters((prev) => ({ ...prev, category: [] }));
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
											const selected = filters.category.includes(label);
											const subItems = subCategoriesByMain.get(label) || [];
											const showSubItems = expandedMainCategory === label;
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
														{!!subItems.length && (
															<>
																<span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-[#7A7A7A]">
																	{subItems.length}
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

													{!!subItems.length && (
														<div
															className={`overflow-hidden transition-all duration-300 ${
																showSubItems
																	? "mt-1.5 max-h-80 opacity-100"
																	: "max-h-0 opacity-0"
															}`}
														>
															<div className="rounded-xl border border-brand-border bg-white p-1.5">
																<div className="max-h-72 space-y-1 overflow-y-auto pr-1">
																	{subItems.map((option) => {
																		const isSubSelected =
																			filters.category.includes(option.value);
																		return (
																			<label
																				key={option.value}
																				className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${
																					isSubSelected
																						? "border-[#FFD600] bg-[#FFF7D6] text-black"
																						: "border-transparent bg-[#FCFCFC] text-brand-dark hover:border-brand-border"
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
									value={filters.listingType}
									onChange={(event) =>
										setFilters((prev) => ({
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
										value={filters.minPrice}
										onChange={(event) =>
											setFilters((prev) => ({
												...prev,
												minPrice: event.target.value,
											}))
										}
									/>
									<input
										className="input-shell"
										placeholder="Max"
										value={filters.maxPrice}
										onChange={(event) =>
											setFilters((prev) => ({
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
								{["New", "Like New", "Good", "Fair"].map((value) => (
									<label
										key={value}
										className="mb-1 flex items-center gap-2 text-sm"
									>
										<input
											type="radio"
											name="condition"
											checked={filters.condition === value}
											onChange={() =>
												setFilters((prev) => ({ ...prev, condition: value }))
											}
										/>
										{value}
									</label>
								))}
							</div>

							<div>
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Seller Type
								</p>
								{["Verified", "Premium", "Dealer"].map((value) => (
									<label
										key={value}
										className="mb-1 flex items-center gap-2 text-sm"
									>
										<input
											type="checkbox"
											checked={filters.sellerType.includes(value)}
											onChange={() => toggleArrayFilter("sellerType", value)}
										/>
										{value}
									</label>
								))}
							</div>

							<div>
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Location Radius
								</p>
								<select
									className="input-shell"
									value={filters.radius}
									onChange={(event) =>
										setFilters((prev) => ({
											...prev,
											radius: event.target.value,
										}))
									}
								>
									<option>5km</option>
									<option>10km</option>
									<option>25km</option>
									<option>50km</option>
								</select>
								<p className="mt-2 text-[11px] text-brand-muted">
									{hasGeoContext
										? `Using location: ${selectedLocationLabel || "Selected location"}`
										: "Choose location in navbar to enable real distance radius filtering."}
								</p>
							</div>

							<button
								className="btn-primary h-12 w-full rounded-xl"
								type="button"
								onClick={() => setPage(1)}
							>
								Apply Filters
							</button>
						</div>
					</aside>

					<section>
						<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
							<div className="flex h-12 items-center rounded-xl border border-brand-border bg-white px-3 sm:flex-1">
								<Search size={16} className="text-brand-muted" />
								<input
									className="ml-2 w-full border-none bg-transparent text-sm outline-none"
									value={search}
									onChange={(event) => {
										setSearch(event.target.value);
										setPage(1);
									}}
									placeholder="Search listings"
								/>
							</div>

							<select
								className="h-12 rounded-xl border border-brand-border bg-white px-3 text-sm sm:w-[170px]"
								value={filters.sort}
								onChange={(event) =>
									setFilters((prev) => ({ ...prev, sort: event.target.value }))
								}
							>
								<option>Newest</option>
								<option>Auction Ending Soon</option>
								<option>Price Low-High</option>
								<option>Price High-Low</option>
								<option>Most Popular</option>
							</select>
						</div>

						<p className="mb-4 text-sm text-brand-muted">
							Showing {results.length} results{search ? ` for "${search}"` : ""}
							{hasFilters ? " with active filters" : ""}
						</p>

						{loading && page === 1 ? (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{Array.from({ length: 6 }).map((_, index) => (
									<div
										key={index}
										className="deal-card h-80 animate-pulse bg-white"
									/>
								))}
							</div>
						) : results.length ? (
							<>
								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
									{results.map((listing) => (
										<ProductCard
											key={listing?._id || listing?.id}
											listing={listing}
										/>
									))}
								</div>

								<div className="mt-7 flex justify-center gap-2">
									<button
										type="button"
										className="rounded-full border border-brand-border bg-white px-5 py-2 text-sm"
										onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
										disabled={page === 1}
									>
										Previous
									</button>
									<button
										type="button"
										className="rounded-full border border-brand-border bg-white px-5 py-2 text-sm"
										onClick={() => setPage((prev) => prev + 1)}
									>
										Next
									</button>
								</div>
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
	);
}
