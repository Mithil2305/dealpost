import { Check, Pencil, RotateCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const TABS = [
	{ label: "All Ads", key: "all" },
	{ label: "Active", key: "active" },
	{ label: "Sold", key: "sold" },
	{ label: "Pending", key: "pending" },
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

const getLocationLabel = (value) => {
	if (!value) return "Unknown";
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		return (
			value?.name || value?.label || value?.city || value?.district || "Unknown"
		);
	}
	return String(value);
};

export default function MyAds() {
	const [tab, setTab] = useState("all");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [listings, setListings] = useState([]);

	const fetchMyListings = useCallback(async () => {
		try {
			setLoading(true);
			const { data } = await api.get("/listings", {
				params: {
					userId: "me",
					page,
				},
			});
			const items = data?.listings || data?.items || [];
			setListings((prev) => (page === 1 ? items : [...prev, ...items]));
		} catch {
			toast.error("Could not load your listings");
		} finally {
			setLoading(false);
		}
	}, [page]);

	useEffect(() => {
		fetchMyListings();
	}, [fetchMyListings]);

	const filtered = useMemo(() => {
		return listings.filter((item) => {
			const status = (item?.status || "active").toLowerCase();
			const byTab = tab === "all" ? true : status === tab;
			const bySearch = item?.title
				?.toLowerCase()
				.includes(search.toLowerCase());
			return byTab && bySearch;
		});
	}, [listings, tab, search]);

	const countByStatus = useMemo(() => {
		return listings.reduce(
			(acc, listing) => {
				const key = (listing?.status || "active").toLowerCase();
				acc[key] = (acc[key] || 0) + 1;
				acc.all += 1;
				return acc;
			},
			{ all: 0, active: 0, sold: 0, pending: 0 },
		);
	}, [listings]);

	const updateStatus = async (id, status) => {
		try {
			await api.patch(`/listings/${id}`, { status });
			setListings((prev) =>
				prev.map((item) =>
					(item?._id || item?.id) === id ? { ...item, status } : item,
				),
			);
			toast.success("Listing updated");
		} catch {
			toast.error("Could not update listing status");
		}
	};

	const removeListing = async (id) => {
		try {
			await api.delete(`/listings/${id}`);
			setListings((prev) =>
				prev.filter((item) => (item?._id || item?.id) !== id),
			);
			toast.success("Listing deleted");
		} catch {
			toast.error("Could not delete listing");
		}
	};

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main className="container-shell py-6 flex-1">
				<h1 className="text-5xl font-display font-bold">My Deals</h1>
				<p className="mt-2 text-brand-muted">
					Manage your gallery of curated listings
				</p>

				<section className="mt-6 rounded-3xl bg-white p-4 sm:p-5">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex flex-wrap gap-2">
							{TABS.map((item) => (
								<button
									key={item.key}
									type="button"
									onClick={() => setTab(item.key)}
									className={`rounded-full px-4 py-2 text-sm ${
										tab === item.key
											? "bg-brand-yellow font-semibold text-brand-dark"
											: "bg-brand-bg text-brand-muted"
									}`}
								>
									{item.label} ({countByStatus[item.key] || 0})
								</button>
							))}
						</div>

						<div className="flex h-11 items-center rounded-full bg-brand-bg px-3 lg:w-72">
							<Search size={15} className="text-brand-muted" />
							<input
								className="ml-2 w-full border-none bg-transparent text-sm outline-none"
								placeholder="Search my listings..."
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					</div>

					{loading && page === 1 ? (
						<div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
							{Array.from({ length: 4 }).map((_, index) => (
								<div
									key={index}
									className="h-[390px] animate-pulse rounded-2xl bg-brand-bg"
								/>
							))}
						</div>
					) : filtered.length ? (
						<div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
							{filtered.map((listing) => {
								const id = listing?._id || listing?.id;
								const status = (listing?.status || "active").toLowerCase();
								const listingLocation = getLocationLabel(
									listing?.location ||
										listing?.city ||
										listing?.district ||
										listing?.seller?.location,
								);
								const listedTime = timeAgo(listing?.createdAt);

								return (
									<article
										key={id}
										className="group flex flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white transition hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
									>
										<div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F5F7]">
											<img
												src={
													listing?.images?.[0]?.url ||
													listing?.image ||
													"https://placehold.co/600x600?text=Deal Post"
												}
												alt={listing?.title || "Listing"}
												className="h-full w-full object-cover"
											/>
											<span className="absolute left-3 top-3 rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
												{status}
											</span>
										</div>

										<div className="flex flex-1 flex-col p-4">
											<p className="text-[1.5rem] font-black tracking-tight text-[#08102A] leading-none">
												{formatPrice(listing?.price)}
											</p>
											<p className="mt-2 line-clamp-1 text-[1rem] font-medium text-[#5C6678]">
												{listing?.title}
											</p>
											<div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem] font-medium uppercase tracking-[0.03em] text-[#778195]">
												<span className="line-clamp-1">{listingLocation}</span>
												<span className="shrink-0">{listedTime}</span>
											</div>

											<div className="mt-4 flex items-center gap-2 border-t border-[#ececec] pt-3">
												<button
													type="button"
													className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E2E2E2] px-3 text-xs text-[#374151]"
												>
													<Pencil size={12} /> Edit
												</button>

												{status === "sold" ? (
													<button
														type="button"
														onClick={() => updateStatus(id, "active")}
														className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E2E2E2] px-3 text-xs text-[#374151]"
													>
														<RotateCw size={12} /> Re-List
													</button>
												) : (
													<button
														type="button"
														onClick={() => updateStatus(id, "sold")}
														className="inline-flex h-9 items-center gap-1 rounded-full bg-[#FFD600] px-3 text-xs font-semibold text-black"
													>
														<Check size={12} /> Sold
													</button>
												)}

												<button
													type="button"
													onClick={() => removeListing(id)}
													className="ml-auto grid h-9 w-9 place-items-center rounded-full text-[#d42d2d] hover:bg-[#fff3f3]"
												>
													<Trash2 size={13} />
												</button>
											</div>
										</div>
									</article>
								);
							})}
						</div>
					) : (
						<div className="deal-card mt-5 grid h-60 place-items-center text-brand-muted">
							No ads found for this filter.
						</div>
					)}

					<div className="mt-7 text-center">
						<button
							type="button"
							onClick={() => setPage((prev) => prev + 1)}
							className="btn-secondary px-9"
						>
							Load More Listings
						</button>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
