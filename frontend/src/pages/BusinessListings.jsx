import {
	ArrowUpRight,
	BadgeCheck,
	Building2,
	Filter,
	MapPin,
	Search,
	Sparkles,
	Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0,
});

const toAmount = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
};

const formatInr = (value) => INR_FORMATTER.format(toAmount(value));

const PAGE_SIZE = 100;

const fetchAllPages = async (path, keys) => {
	let page = 1;
	const rows = [];

	while (true) {
		const { data } = await api.get(path, {
			params: {
				page,
				limit: PAGE_SIZE,
			},
		});

		const chunk = pickArray(data, keys);
		if (chunk.length) {
			rows.push(...chunk);
		}

		const totalPages = Number(data?.pages);
		if (Number.isFinite(totalPages) && totalPages > 0) {
			if (page >= totalPages) break;
			page += 1;
			continue;
		}

		if (chunk.length < PAGE_SIZE) break;
		page += 1;
	}

	return rows;
};

const getSubCategoryOnly = (value) => {
	const normalized = String(value || "").trim();
	if (!normalized) return "General";

	const parts = normalized
		.split(">")
		.map((part) => part.trim())
		.filter(Boolean);

	if (!parts.length) return "General";
	return parts[parts.length - 1];
};

export default function BusinessListings() {
	const { isAuthenticated, user } = useAuth();
	const [remoteStores, setRemoteStores] = useState([]);
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [cityFilter, setCityFilter] = useState("all");
	const [onlyWithListings, setOnlyWithListings] = useState(false);
	const [selectedBusiness, setSelectedBusiness] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [storesRows, listingRows] = await Promise.all([
					fetchAllPages("/businesses", [
						"businesses",
						"stores",
						"data",
						"items",
					]),
					fetchAllPages("/listings", ["listings", "items", "data", "results"]),
				]);

				setRemoteStores(storesRows);
				setListings(listingRows);
			} catch (error) {
				toast.error(
					error?.response?.data?.message ||
						"Unable to load business listings from server",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const stores = useMemo(() => {
		const derivedStores = listings
			.map((listing, index) => {
				const seller =
					typeof listing?.seller === "object" && listing?.seller !== null
						? listing.seller
						: {};
				const businessName = String(
					listing?.business?.name ||
						listing?.businessName ||
						seller?.businessName ||
						seller?.name ||
						"",
				).trim();
				const ownerId =
					seller?.id || listing?.sellerId || listing?.ownerId || null;

				if (!businessName && !ownerId) {
					return null;
				}

				return {
					id: ownerId || `listing-owner-${index}`,
					ownerId,
					businessName,
					name: String(seller?.name || businessName || "").trim(),
					email: String(seller?.email || "").trim(),
					location:
						typeof seller?.location === "string"
							? seller.location
							: listing?.location?.name ||
								listing?.location?.city ||
								listing?.location?.label ||
								"Not specified",
				};
			})
			.filter(Boolean);

		const merged = [...remoteStores, ...derivedStores];
		const unique = [];
		const seen = new Set();

		for (const store of merged) {
			const key = String(
				store?.id ||
					store?._id ||
					store?.email ||
					store?.businessName ||
					store?.name ||
					"",
			);

			if (!key || seen.has(key)) continue;
			seen.add(key);
			unique.push(store);
		}

		return unique;
	}, [remoteStores, listings]);

	const getStoreListings = useCallback(
		(store) => {
			const ownerId = Number(store?.ownerId || store?.owner?.id || store?.id);
			const businessName = String(
				store?.businessName || store?.name || "",
			).toLowerCase();
			const ownerEmail = String(store?.email || "").toLowerCase();

			return listings.filter((item) => {
				const sellerId = Number(
					item?.seller?.id || item?.sellerId || item?.ownerId,
				);
				const listingBusiness = String(
					item?.business?.name || item?.businessName || item?.storeName || "",
				).toLowerCase();
				const sellerEmail = String(
					item?.seller?.email || item?.owner?.email || "",
				).toLowerCase();

				if (Number.isFinite(ownerId) && Number.isFinite(sellerId)) {
					if (ownerId === sellerId) return true;
				}

				if (
					businessName &&
					listingBusiness &&
					listingBusiness === businessName
				) {
					return true;
				}

				if (ownerEmail && sellerEmail && ownerEmail === sellerEmail) {
					return true;
				}

				return false;
			});
		},
		[listings],
	);

	const storesWithMeta = useMemo(() => {
		return stores.map((store) => {
			const storeListings = getStoreListings(store);
			const name = store?.businessName || store?.name || "Unnamed Business";
			const location = store?.location || "Not specified";
			const categoryLabel = getSubCategoryOnly(store?.category || "General");
			const description =
				String(store?.description || "").trim() || "No description available";
			const businessLocationUrl =
				String(store?.businessLocationUrl || "").trim() || "";
			const totalValue = storeListings.reduce(
				(sum, item) => sum + Number(item?.price || 0),
				0,
			);

			return {
				store,
				name,
				location,
				categoryLabel,
				description,
				businessLocationUrl,
				storeListings,
				totalValue,
			};
		});
	}, [getStoreListings, stores]);

	const locations = useMemo(() => {
		const unique = new Set(
			storesWithMeta
				.map((item) => item.location)
				.filter((value) => value && value !== "Not specified"),
		);
		return ["all", ...Array.from(unique)];
	}, [storesWithMeta]);

	const filteredStores = useMemo(() => {
		return storesWithMeta.filter((item) => {
			const byQuery = `${item.name} ${item.store?.email || ""} ${item.location}`
				.toLowerCase()
				.includes(query.toLowerCase());
			const byCity = cityFilter === "all" ? true : item.location === cityFilter;
			const byListings = onlyWithListings
				? item.storeListings.length > 0
				: true;

			return byQuery && byCity && byListings;
		});
	}, [storesWithMeta, query, cityFilter, onlyWithListings]);

	const totalListingCount = useMemo(
		() =>
			storesWithMeta.reduce((sum, item) => sum + item.storeListings.length, 0),
		[storesWithMeta],
	);

	const liveCities = useMemo(
		() => locations.filter((item) => item !== "all").length,
		[locations],
	);

	const businessCtaPath = isAuthenticated
		? "/business-registration"
		: "/signup";
	const businessCtaLabel = isAuthenticated
		? "Register a Business "
		: "Register a Business";
	const hasBusinessAccount =
		isAuthenticated &&
		String(user?.accountType || "").toLowerCase() === "business";

	return (
		<div className="min-h-screen bg-brand-bg text-brand-dark font-body flex flex-col">
			<Navbar />

			<main id="main-content" className="container-shell py-8 flex-1">
				<section className="relative overflow-hidden rounded-[28px] bg-[#101010] p-5 text-white md:p-7 lg:p-8">
					<div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand-yellow/25 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

					<div className="relative z-10 space-y-6 lg:space-y-7">
						<div>
							<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-8">
								<div className="space-y-3">
									<h1 className="text-3xl font-display font-bold leading-[1.05] md:text-5xl">
										Business Listings
									</h1>
									<p className="max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
										Explore verified stores, scan their newest products, and
										compare multiple business catalogs in one feed.
									</p>
									<p className="text-[11px] uppercase tracking-[0.14em] text-brand-yellow/90">
										Business listing is free forever
									</p>
								</div>
								<div className="flex w-full max-w-xs flex-col gap-3 xl:ml-auto">
									<Link
										to={businessCtaPath}
										className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-yellow px-5 text-sm font-semibold text-brand-dark transition hover:brightness-95"
									>
										{businessCtaLabel}
									</Link>
									{hasBusinessAccount ? (
										<Link
											to="/post-ad?mode=business"
											className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 text-sm font-semibold transition hover:bg-white/15"
										>
											Post Business Deal
										</Link>
									) : null}
									<Link
										to="/explore"
										className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 text-sm font-semibold transition hover:bg-white/15"
									>
										Browse Public Listings
									</Link>
								</div>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-3 md:gap-4">
							<div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:p-5">
								<p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
									Active Stores
								</p>
								<p className="mt-2 text-3xl font-display font-bold md:text-4xl">
									{storesWithMeta.length}
								</p>
							</div>
							<div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:p-5">
								<p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
									Total Listings
								</p>
								<p className="mt-2 text-3xl font-display font-bold md:text-4xl">
									{totalListingCount}
								</p>
							</div>
							<div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:p-5">
								<p className="text-[11px] uppercase tracking-[0.14em] text-white/65">
									Cities Covered
								</p>
								<p className="mt-2 text-3xl font-display font-bold md:text-4xl">
									{liveCities}
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-5 rounded-3xl border border-brand-border bg-white p-4 shadow-sm">
					<div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
						<div className="flex h-11 items-center rounded-xl bg-brand-bg px-3">
							<Search size={16} className="text-brand-muted" />
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search business name, location, or email"
								className="ml-2 w-full border-none bg-transparent text-sm outline-none"
							/>
						</div>

						<div className="flex items-center gap-2 rounded-xl bg-brand-bg px-3">
							<Filter size={15} className="text-brand-muted" />
							<select
								value={cityFilter}
								onChange={(event) => setCityFilter(event.target.value)}
								className="h-11 bg-transparent pr-8 text-sm outline-none"
							>
								{locations.map((item) => (
									<option key={item} value={item}>
										{item === "all" ? "All locations" : item}
									</option>
								))}
							</select>
						</div>

						<button
							type="button"
							onClick={() => setOnlyWithListings((prev) => !prev)}
							className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${
								onlyWithListings
									? "bg-brand-yellow text-brand-dark"
									: "bg-brand-bg text-brand-muted"
							}`}
						>
							With listings only
						</button>

						<div className="flex h-11 items-center justify-center rounded-xl bg-[#111111] px-4 text-sm font-semibold text-white">
							{filteredStores.length} result
						</div>
					</div>
				</section>

				{loading ? (
					<div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<div
								key={index}
								className="mt-4 h-[420px] animate-pulse rounded-3xl bg-white"
							/>
						))}
					</div>
				) : filteredStores.length ? (
					<div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
						{filteredStores.map((item, index) => {
							const {
								store,
								storeListings,
								name,
								location,
								totalValue,
								categoryLabel,
							} = item;

							return (
								<article
									key={
										store?.id ||
										store?._id ||
										store?.email ||
										`${name}-${index}`
									}
									className="overflow-hidden rounded-3xl border border-brand-border bg-white cursor-pointer transition hover:shadow-md"
									onClick={() => setSelectedBusiness(item)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											setSelectedBusiness(item);
										}
									}}
									role="button"
									tabIndex={0}
								>
									<div className="relative bg-[#111111] p-5 text-white">
										<div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-brand-yellow/30 blur-2xl" />
										<div className="relative z-10 flex items-start justify-between gap-3">
											<div className="flex items-center gap-2">
												<div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
													<Store size={18} className="text-brand-yellow" />
												</div>
												<div>
													<h2 className="text-xl font-display font-bold">
														{name}
													</h2>
													<p className="mt-0.5 inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-white/65">
														<BadgeCheck
															size={12}
															className="text-brand-yellow"
														/>
														Business Account
													</p>
												</div>
											</div>
											<span className="rounded-full bg-brand-yellow px-3 py-1 text-xs font-semibold text-brand-dark">
												{storeListings.length} Listings
											</span>
										</div>
									</div>

									<div className="space-y-4 p-5">
										<div className="grid grid-cols-3 gap-2 text-center">
											<div className="rounded-xl bg-brand-bg px-2 py-3">
												<p className="text-[10px] uppercase tracking-[0.12em] text-brand-muted">
													Store Rank
												</p>
												<p className="mt-1 text-lg font-bold">#{index + 1}</p>
											</div>
											<div className="rounded-xl bg-brand-bg px-2 py-3">
												<p className="text-[10px] uppercase tracking-[0.12em] text-brand-muted">
													Listings
												</p>
												<p className="mt-1 text-lg font-bold">
													{storeListings.length}
												</p>
											</div>
											<div className="rounded-xl bg-brand-bg px-2 py-3">
												<p className="text-[10px] uppercase tracking-[0.12em] text-brand-muted">
													Total Value
												</p>
												<p className="mt-1 text-lg font-bold">
													{formatInr(totalValue)}
												</p>
											</div>
										</div>

										<div className="space-y-2 text-sm text-brand-muted">
											<p className="inline-flex items-center gap-2">
												<MapPin size={14} /> {location}
											</p>
											<p className="inline-flex items-center gap-2">
												<Building2 size={14} />
												Category: {categoryLabel || "General"}
											</p>
										</div>
									</div>

									<div className="mx-5 mb-5 space-y-2 rounded-2xl bg-brand-bg p-3">
										<p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand-muted">
											<Building2 size={12} />
											Latest Listings
										</p>
										{storeListings.length ? (
											storeListings.slice(0, 3).map((item, itemIndex) => {
												return (
													<div
														key={
															(item?._id ||
																item?.id ||
																item?.productId ||
																itemIndex) + String(itemIndex)
														}
														className="group flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
													>
														<div className="min-w-0 flex-1">
															<p className="line-clamp-1 font-medium">
																{item?.title || "Untitled Listing"}
															</p>
															<p className="text-xs text-brand-muted">
																{item?.category || "General"}
															</p>
														</div>
														<div className="ml-3 flex items-center gap-2">
															<span className="font-mono font-semibold text-brand-dark">
																{formatInr(item?.price)}
															</span>
															<ArrowUpRight
																size={14}
																className="text-brand-muted transition group-hover:text-brand-dark"
															/>
														</div>
													</div>
												);
											})
										) : (
											<p className="rounded-xl bg-white px-3 py-2 text-sm text-brand-muted">
												No listings yet.
											</p>
										)}
									</div>
									<div className="px-5 pb-5">
										<span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B7322]">
											View details <ArrowUpRight size={12} />
										</span>
									</div>
								</article>
							);
						})}
					</div>
				) : (
					<div className="mt-4 rounded-3xl border border-brand-border bg-white p-10 text-center">
						<div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-bg">
							<Store size={26} className="text-brand-muted" />
						</div>
						<p className="mt-4 text-lg font-semibold">
							No business stores matched your filters.
						</p>
						<p className="mt-2 text-sm text-brand-muted">
							Try changing location/search filters or create a new business
							account.
						</p>
						<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
							<button
								type="button"
								onClick={() => {
									setQuery("");
									setCityFilter("all");
									setOnlyWithListings(false);
								}}
								className="inline-flex h-10 items-center rounded-full bg-brand-bg px-4 text-sm font-semibold"
							>
								Clear Filters
							</button>
							<Link
								to={businessCtaPath}
								className="inline-flex h-10 items-center rounded-full bg-brand-yellow px-4 text-sm font-semibold"
							>
								{businessCtaLabel}
							</Link>
						</div>
					</div>
				)}

				<Modal
					isOpen={Boolean(selectedBusiness)}
					onClose={() => setSelectedBusiness(null)}
					title={selectedBusiness?.name || "Business Details"}
					size="xl"
				>
					{selectedBusiness ? (
						<div className="space-y-4">
							<div className="grid gap-3 rounded-2xl bg-brand-bg p-4 sm:grid-cols-2">
								<p className="text-sm">
									<span className="font-semibold">Business Name:</span>{" "}
									{selectedBusiness.name}
								</p>
								<p className="text-sm">
									<span className="font-semibold">Location:</span>{" "}
									{selectedBusiness.location}
								</p>
								<p className="text-sm">
									<span className="font-semibold">Email:</span>{" "}
									{selectedBusiness.store?.email || "-"}
								</p>
								<p className="text-sm">
									<span className="font-semibold">GST/MSME:</span>{" "}
									{selectedBusiness.store?.gstOrMsme || "-"}
								</p>
								<p className="text-sm">
									<span className="font-semibold">Listings:</span>{" "}
									{selectedBusiness.storeListings.length}
								</p>
								<p className="text-sm">
									<span className="font-semibold">Total Value:</span>{" "}
									{formatInr(selectedBusiness.totalValue)}
								</p>
								<p className="text-sm sm:col-span-2">
									<span className="font-semibold">Description:</span>{" "}
									{selectedBusiness.description || "No description available"}
								</p>
								<p className="text-sm sm:col-span-2">
									<span className="font-semibold">Business Location Link:</span>{" "}
									{selectedBusiness.businessLocationUrl ? (
										<a
											href={selectedBusiness.businessLocationUrl}
											target="_blank"
											rel="noreferrer"
											className="font-semibold text-[#8b7008] underline"
										>
											Open in Google Maps
										</a>
									) : (
										"-"
									)}
								</p>
							</div>

							<div>
								<h3 className="text-sm font-bold uppercase tracking-[0.1em] text-brand-muted">
									All listings
								</h3>
								<div className="mt-2 max-h-[360px] space-y-2 overflow-y-auto pr-1">
									{selectedBusiness.storeListings.length ? (
										selectedBusiness.storeListings.map(
											(listingItem, listingIndex) => {
												const listingId =
													listingItem?._id ||
													listingItem?.id ||
													listingItem?.productId;
												return (
													<Link
														key={
															(listingId || listingIndex) + String(listingIndex)
														}
														to={
															listingId ? `/listing/${listingId}` : "/explore"
														}
														onClick={() => setSelectedBusiness(null)}
														className="flex items-center justify-between rounded-xl border border-brand-border bg-white px-3 py-2 text-sm"
													>
														<div className="min-w-0">
															<p className="line-clamp-1 font-semibold text-brand-dark">
																{listingItem?.title || "Untitled Listing"}
															</p>
															<p className="line-clamp-1 text-xs text-brand-muted">
																{listingItem?.category || "General"}
															</p>
														</div>
														<span className="ml-3 font-semibold text-brand-dark">
															{formatInr(listingItem?.price)}
														</span>
													</Link>
												);
											},
										)
									) : (
										<p className="rounded-xl border border-dashed border-brand-border bg-white px-3 py-4 text-sm text-brand-muted">
											No listings available for this business.
										</p>
									)}
								</div>
							</div>
						</div>
					) : null}
				</Modal>
			</main>

			<Footer />
		</div>
	);
}
