import {
	ArrowUpRight,
	BadgeCheck,
	BriefcaseBusiness,
	Building2,
	Filter,
	MapPin,
	Search,
	Sparkles,
	Store,
	Tag,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";

export default function BusinessListings() {
	const { isAuthenticated } = useAuth();
	const [remoteStores, setRemoteStores] = useState([]);
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [cityFilter, setCityFilter] = useState("all");
	const [onlyWithListings, setOnlyWithListings] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [storesRes, listingsRes] = await Promise.all([
					api.get("/businesses").catch(() => ({ data: [] })),
					api.get("/listings").catch(() => ({ data: [] })),
				]);

				setRemoteStores(
					pickArray(storesRes?.data, ["businesses", "stores", "data", "items"]),
				);
				setListings(
					pickArray(listingsRes?.data, [
						"listings",
						"items",
						"data",
						"results",
					]),
				);
			} catch {
				toast.error("Unable to load business listings");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const stores = useMemo(() => {
		const merged = [...remoteStores];
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
	}, [remoteStores]);

	const getStoreListings = useCallback(
		(store) => {
			const businessName = String(
				store?.businessName || store?.name || "",
			).toLowerCase();
			const ownerEmail = String(store?.email || "").toLowerCase();

			return listings.filter((item) => {
				const listingBusiness = String(
					item?.business?.name || item?.businessName || item?.storeName || "",
				).toLowerCase();
				const sellerEmail = String(
					item?.seller?.email || item?.owner?.email || "",
				).toLowerCase();

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
			const totalValue = storeListings.reduce(
				(sum, item) => sum + Number(item?.price || 0),
				0,
			);

			return {
				store,
				name,
				location,
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

	const businessCtaPath = isAuthenticated ? "/post-business-ad" : "/signup";
	const businessCtaLabel = isAuthenticated
		? "Register Business Listing"
		: "Register Business";

	return (
		<div className="min-h-screen bg-brand-bg text-brand-dark flex flex-col">
			<Navbar />

			<main id="main-content" className="container-shell py-8 flex-1">
				<section className="relative overflow-hidden rounded-[36px] bg-[#101010] p-6 text-white md:p-10">
					<div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-yellow/25 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

					<div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
						<div>
							<p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.15em]">
								<Sparkles size={12} className="text-brand-yellow" />
								Marketplace Directory
							</p>
							<h1 className="mt-4 text-4xl font-display font-bold leading-tight md:text-6xl">
								Business Listings
							</h1>
							<p className="mt-4 max-w-2xl text-sm text-white/70 md:text-base">
								Explore verified stores, scan their newest products, and compare
								multiple business catalogs in one feed.
							</p>

							<div className="mt-6 flex flex-wrap items-center gap-3">
								<Link
									to={businessCtaPath}
									className="inline-flex h-11 items-center rounded-full bg-brand-yellow px-5 text-sm font-semibold text-brand-dark"
								>
									{businessCtaLabel}
								</Link>
								<Link
									to="/explore"
									className="inline-flex h-11 items-center rounded-full border border-white/30 bg-white/10 px-5 text-sm font-semibold"
								>
									Browse Public Listings
								</Link>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
							<div className="rounded-2xl border border-white/15 bg-white/10 p-4">
								<p className="text-xs uppercase tracking-[0.15em] text-white/65">
									Active Stores
								</p>
								<p className="mt-2 text-4xl font-display font-bold">
									{storesWithMeta.length}
								</p>
							</div>
							<div className="rounded-2xl border border-white/15 bg-white/10 p-4">
								<p className="text-xs uppercase tracking-[0.15em] text-white/65">
									Total Listings
								</p>
								<p className="mt-2 text-4xl font-display font-bold">
									{totalListingCount}
								</p>
							</div>
							<div className="rounded-2xl border border-white/15 bg-white/10 p-4">
								<p className="text-xs uppercase tracking-[0.15em] text-white/65">
									Cities Covered
								</p>
								<p className="mt-2 text-4xl font-display font-bold">
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
							const { store, storeListings, name, location, totalValue } = item;

							return (
								<article
									key={
										store?.id ||
										store?._id ||
										store?.email ||
										`${name}-${index}`
									}
									className="overflow-hidden rounded-3xl border border-brand-border bg-white"
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
												<p className="mt-1 text-lg font-bold">${totalValue}</p>
											</div>
										</div>

										<div className="space-y-2 text-sm text-brand-muted">
											<p className="inline-flex items-center gap-2">
												<Tag size={14} /> GST/MSME: {store?.gstOrMsme || "-"}
											</p>
											<p className="inline-flex items-center gap-2">
												<MapPin size={14} /> {location}
											</p>
											<p className="inline-flex items-center gap-2">
												<BriefcaseBusiness size={14} />
												{store?.email || "No contact email"}
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
												const itemId = item?._id || item?.id;
												return (
													<Link
														key={itemId || itemIndex}
														to={itemId ? `/listing/${itemId}` : "/explore"}
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
																${item?.price || 0}
															</span>
															<ArrowUpRight
																size={14}
																className="text-brand-muted transition group-hover:text-brand-dark"
															/>
														</div>
													</Link>
												);
											})
										) : (
											<p className="rounded-xl bg-white px-3 py-2 text-sm text-brand-muted">
												No listings yet.
											</p>
										)}
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
			</main>

			<Footer />
		</div>
	);
}

