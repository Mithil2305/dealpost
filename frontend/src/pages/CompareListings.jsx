import {
	ArrowRightLeft,
	CalendarClock,
	Heart,
	Scale,
	Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const formatPrice = (price) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(Number(price || 0));

const getCategoryLeaf = (value) => {
	if (!value) return "General";
	const parts = String(value)
		.split(">")
		.map((segment) => segment.trim())
		.filter(Boolean);
	return parts[parts.length - 1] || "General";
};

const getListedDaysAgo = (createdAt) => {
	if (!createdAt) return 0;
	const timestamp = new Date(createdAt).getTime();
	if (Number.isNaN(timestamp)) return 0;
	const ms = Date.now() - timestamp;
	return Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0);
};

const getNumericLikeCount = (listing) => {
	const value = Number(
		listing?.likedByCount || listing?.likeCount || listing?.likes || 0,
	);
	return Number.isFinite(value) ? value : 0;
};

const getSpecValue = (listing, key) => {
	const specs = listing?.specifications || listing?.specs || {};
	if (!specs || typeof specs !== "object") return "-";
	const match = Object.keys(specs).find(
		(specKey) => specKey.toLowerCase() === key.toLowerCase(),
	);
	if (!match) return "-";
	return specs[match] || "-";
};

const scoreDeal = (listing, allListings) => {
	const likes = getNumericLikeCount(listing);
	const price = Number(listing?.price || 0);
	const daysAgo = getListedDaysAgo(listing?.createdAt);

	const maxLikes = Math.max(
		...allListings.map((item) => getNumericLikeCount(item)),
		1,
	);
	const maxPrice = Math.max(
		...allListings.map((item) => Number(item?.price || 0)),
		1,
	);
	const freshnessCap = 30;

	const popularityScore = Math.min((likes / maxLikes) * 100, 100);
	const valueScore = Math.max(0, 100 - (price / maxPrice) * 100);
	const freshnessScore = Math.max(
		0,
		100 - Math.min(daysAgo, freshnessCap) * (100 / freshnessCap),
	);

	return Math.round(
		popularityScore * 0.35 + valueScore * 0.4 + freshnessScore * 0.25,
	);
};

export default function CompareListings() {
	const [searchParams] = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [entries, setEntries] = useState([]);
	const [manualOptions, setManualOptions] = useState([]);
	const [manualSelection, setManualSelection] = useState([]);

	const seed = useMemo(() => {
		return String(searchParams.get("seed") || "").trim();
	}, [searchParams]);

	const ids = useMemo(() => {
		const raw = searchParams.get("ids") || "";
		return raw
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean)
			.filter((value, index, array) => array.indexOf(value) === index)
			.slice(0, 4);
	}, [searchParams]);

	const getComparableId = (listing) => {
		return String(
			listing?.productId || listing?.id || listing?._id || "",
		).trim();
	};

	const extractListingRows = (payload) => {
		if (!payload) return [];
		if (Array.isArray(payload)) return payload;
		if (Array.isArray(payload.listings)) return payload.listings;
		if (Array.isArray(payload.items)) return payload.items;
		if (Array.isArray(payload.data)) return payload.data;
		return [];
	};

	useEffect(() => {
		let active = true;

		const fetchListings = async () => {
			try {
				setLoading(true);
				if (active) {
					setManualOptions([]);
					setManualSelection([]);
				}

				if (ids.length >= 2) {
					const responses = await Promise.all(
						ids.map((id) => api.get(`/listings/${id}`)),
					);
					const rows = responses
						.map((response) => response?.data?.listing || response?.data)
						.filter(Boolean);

					if (active) {
						setEntries(rows);
					}
					return;
				}

				if (!seed) {
					if (active) {
						setEntries([]);
					}
					return;
				}

				const selectedResponse = await api.get(`/listings/${seed}`);
				const selected =
					selectedResponse?.data?.listing || selectedResponse?.data || null;

				if (!selected) {
					if (active) {
						setEntries([]);
					}
					return;
				}

				const selectedId = getComparableId(selected);
				const categoryPath = String(selected?.category || "").trim();
				let relatedRows = [];

				if (categoryPath) {
					const relatedResponse = await api.get("/listings", {
						params: {
							category: categoryPath,
							limit: 20,
							sort: "Most Popular",
						},
					});
					relatedRows = extractListingRows(relatedResponse?.data);
				}

				const alternatives = relatedRows
					.filter((item) => getComparableId(item) !== selectedId)
					.slice(0, 3);

				if (active) {
					setEntries([selected]);
					setManualOptions(alternatives);
				}

				if (!alternatives.length) {
					toast.error("No similar products found in the same subcategory");
				}
			} catch {
				if (active) {
					setEntries([]);
					setManualOptions([]);
					setManualSelection([]);
					toast.error("Unable to load listings for comparison");
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		fetchListings();

		return () => {
			active = false;
		};
	}, [ids, seed]);

	const toggleManualPick = (entry) => {
		const id = getComparableId(entry);
		if (!id) return;

		setManualSelection((prev) => {
			if (prev.some((item) => getComparableId(item) === id)) {
				return prev.filter((item) => getComparableId(item) !== id);
			}
			if (prev.length >= 3) {
				toast.error("You can select up to 3 additional products");
				return prev;
			}
			return [...prev, entry];
		});
	};

	const selectedEntries = useMemo(() => {
		if (ids.length >= 2) return entries;
		if (!seed) return entries;
		return [...entries, ...manualSelection].slice(0, 4);
	}, [ids, seed, entries, manualSelection]);

	const scoredEntries = useMemo(() => {
		return selectedEntries
			.map((entry) => ({
				entry,
				score: scoreDeal(entry, selectedEntries),
			}))
			.sort((a, b) => b.score - a.score);
	}, [selectedEntries]);

	const leadingEntryId =
		scoredEntries[0]?.entry?.id || scoredEntries[0]?.entry?._id;

	const specKeys = useMemo(() => {
		const pool = new Set();
		selectedEntries.forEach((entry) => {
			const specs = entry?.specifications || entry?.specs || {};
			if (!specs || typeof specs !== "object") return;
			Object.keys(specs).forEach((key) => pool.add(key));
		});
		return Array.from(pool).slice(0, 8);
	}, [selectedEntries]);

	const comparedCategories = useMemo(() => {
		return Array.from(
			new Set(
				selectedEntries
					.map((entry) => getCategoryLeaf(entry?.category))
					.filter(Boolean),
			),
		);
	}, [selectedEntries]);

	const hasMixedCategories = comparedCategories.length > 1;

	return (
		<div className="min-h-screen bg-[#f7f7f4] text-black flex flex-col">
			<Navbar />

			<main id="main-content" className="mx-auto w-full max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8 flex-1">
				<section className="rounded-[32px] bg-[#111111] p-8 text-white md:p-12">
					<div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]">
						<Sparkles size={12} className="text-[#FFD600]" />
						AI Comparison Lab
					</div>
					<h1 className="mt-5 text-3xl font-bold md:text-5xl">
						Compare Listings Deeply
					</h1>
					<p className="mt-3 max-w-2xl text-sm text-white/75 md:text-base">
						See value score, popularity, freshness, and specs side-by-side
						before you choose.
					</p>
				</section>

				{loading ? (
					<div className="mt-8 rounded-3xl bg-white p-8 shadow-sm border border-[#ececec]">
						Loading comparison...
					</div>
				) : selectedEntries.length < 2 ? (
					<div className="mt-8 rounded-3xl bg-white p-8 shadow-sm border border-[#ececec] space-y-3">
						<h2 className="text-2xl font-bold">Need at least 2 listings</h2>
						<p className="text-sm text-[#6f6f6f]">
							Select one or more products from the same subcategory to continue.
						</p>
						{seed && entries.length === 1 && manualOptions.length > 0 ? (
							<div className="mt-2">
								<p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#666]">
									Choose products to compare with your selected item
								</p>
								<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
									{manualOptions.map((item) => {
										const itemId = getComparableId(item);
										const picked = manualSelection.some(
											(row) => getComparableId(row) === itemId,
										);
										return (
											<button
												key={itemId}
												type="button"
												onClick={() => toggleManualPick(item)}
												className={`rounded-2xl border p-4 text-left transition ${picked ? "border-[#FFD600] bg-[#fff9df]" : "border-[#e8e8e8] bg-white hover:border-[#d6d6d6]"}`}
											>
												<p className="line-clamp-1 text-sm font-bold text-black">
													{item?.title}
												</p>
												<p className="mt-1 text-xs text-[#666]">
													{getCategoryLeaf(item?.category)}
												</p>
												<p className="mt-2 text-sm font-semibold text-black">
													{formatPrice(item?.price)}
												</p>
												<p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a8a8a]">
													{picked ? "Selected" : "Tap to select"}
												</p>
											</button>
										);
									})}
								</div>
							</div>
						) : null}
						<Link
							to="/"
							className="inline-flex items-center gap-2 rounded-full bg-[#FFD600] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-black"
						>
							Back to Home <ArrowRightLeft size={14} />
						</Link>
					</div>
				) : hasMixedCategories ? (
					<div className="mt-8 rounded-3xl bg-white p-8 shadow-sm border border-[#ececec] space-y-3">
						<h2 className="text-2xl font-bold">
							Comparison requires same category
						</h2>
						<p className="text-sm text-[#6f6f6f]">
							You selected mixed categories: {comparedCategories.join(", ")}.
							Please choose products from one category only.
						</p>
						<Link
							to="/"
							className="inline-flex items-center gap-2 rounded-full bg-[#FFD600] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-black"
						>
							Choose Same Category <ArrowRightLeft size={14} />
						</Link>
					</div>
				) : (
					<div className="mt-8 grid gap-6">
						<section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
							{scoredEntries.map(({ entry, score }) => {
								const entryId = entry?.id || entry?._id;
								const isLeading = entryId === leadingEntryId;
								return (
									<article
										key={entryId}
										className={`rounded-3xl border p-5 transition ${isLeading ? "border-[#FFD600] bg-[#fff9df] shadow-[0_12px_24px_rgba(0,0,0,0.08)]" : "border-[#ececec] bg-white shadow-sm"}`}
									>
										<div className="flex items-start justify-between gap-3">
											<h3 className="text-base font-bold line-clamp-2">
												{entry?.title}
											</h3>
											{isLeading ? (
												<span className="rounded-full bg-black px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white">
													Best Value
												</span>
											) : null}
										</div>
										<p className="mt-2 text-sm text-[#777]">
											{getCategoryLeaf(entry?.category)}
										</p>
										<div className="mt-4 flex items-end justify-between">
											<p className="text-2xl font-bold">
												{formatPrice(entry?.price)}
											</p>
											<p className="text-sm font-semibold text-[#c53535]">
												{score}/100
											</p>
										</div>
										<div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#555]">
											<p className="rounded-xl bg-[#f6f6f6] px-3 py-2 flex items-center gap-1.5">
												<Heart size={13} /> {getNumericLikeCount(entry)} likes
											</p>
											<p className="rounded-xl bg-[#f6f6f6] px-3 py-2 flex items-center gap-1.5">
												<CalendarClock size={13} />{" "}
												{getListedDaysAgo(entry?.createdAt)}d ago
											</p>
										</div>
										<Link
											to={`/listing/${entry?.productId || entry?.id || entry?._id}`}
											className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-black"
										>
											View Listing <ArrowRightLeft size={14} />
										</Link>
									</article>
								);
							})}
						</section>

						<section className="overflow-x-auto rounded-3xl border border-[#ececec] bg-white shadow-sm">
							<table className="min-w-full border-collapse text-left">
								<thead>
									<tr className="border-b border-[#efefef] bg-[#fafafa]">
										<th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#666]">
											Metric
										</th>
										{scoredEntries.map(({ entry }) => (
											<th
												key={entry?.id || entry?._id}
												className="px-5 py-4 text-sm font-bold text-black min-w-[220px]"
											>
												{entry?.title}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									<tr className="border-b border-[#f1f1f1]">
										<td className="px-5 py-4 text-sm font-semibold text-[#555]">
											Price
										</td>
										{scoredEntries.map(({ entry }) => (
											<td
												key={`price-${entry?.id || entry?._id}`}
												className="px-5 py-4 text-sm font-semibold"
											>
												{formatPrice(entry?.price)}
											</td>
										))}
									</tr>
									<tr className="border-b border-[#f1f1f1]">
										<td className="px-5 py-4 text-sm font-semibold text-[#555]">
											Category
										</td>
										{scoredEntries.map(({ entry }) => (
											<td
												key={`cat-${entry?.id || entry?._id}`}
												className="px-5 py-4 text-sm"
											>
												{getCategoryLeaf(entry?.category)}
											</td>
										))}
									</tr>
									<tr className="border-b border-[#f1f1f1]">
										<td className="px-5 py-4 text-sm font-semibold text-[#555]">
											Like Count
										</td>
										{scoredEntries.map(({ entry }) => (
											<td
												key={`likes-${entry?.id || entry?._id}`}
												className="px-5 py-4 text-sm"
											>
												{getNumericLikeCount(entry)}
											</td>
										))}
									</tr>
									<tr className="border-b border-[#f1f1f1]">
										<td className="px-5 py-4 text-sm font-semibold text-[#555]">
											Listed
										</td>
										{scoredEntries.map(({ entry }) => (
											<td
												key={`listed-${entry?.id || entry?._id}`}
												className="px-5 py-4 text-sm"
											>
												{getListedDaysAgo(entry?.createdAt)} days ago
											</td>
										))}
									</tr>
									<tr className="border-b border-[#f1f1f1]">
										<td className="px-5 py-4 text-sm font-semibold text-[#555]">
											Value Score
										</td>
										{scoredEntries.map(({ entry, score }) => (
											<td
												key={`score-${entry?.id || entry?._id}`}
												className="px-5 py-4 text-sm font-bold"
											>
												<div className="inline-flex items-center gap-2 rounded-full bg-[#f2f2f2] px-3 py-1.5">
													<Scale size={14} /> {score}/100
												</div>
											</td>
										))}
									</tr>

									{specKeys.map((specKey) => (
										<tr
											key={specKey}
											className="border-b border-[#f1f1f1] last:border-b-0"
										>
											<td className="px-5 py-4 text-sm font-semibold text-[#555]">
												{specKey}
											</td>
											{scoredEntries.map(({ entry }) => (
												<td
													key={`${specKey}-${entry?.id || entry?._id}`}
													className="px-5 py-4 text-sm text-[#232323]"
												>
													{getSpecValue(entry, specKey)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</section>
					</div>
				)}
			</main>

			<Footer />
		</div>
	);
}

