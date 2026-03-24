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
				<h1 className="text-5xl font-display font-bold">My Ads</h1>
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
						<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							{Array.from({ length: 4 }).map((_, index) => (
								<div
									key={index}
									className="h-[390px] animate-pulse rounded-2xl bg-brand-bg"
								/>
							))}
						</div>
					) : filtered.length ? (
						<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							{filtered.map((listing) => {
								const id = listing?._id || listing?.id;
								const status = (listing?.status || "active").toLowerCase();

								return (
									<article
										key={id}
										className="overflow-hidden rounded-2xl border border-brand-border bg-white"
									>
										<div className="relative h-52 bg-[#ececec]">
											<img
												src={
													listing?.images?.[0]?.url ||
													listing?.image ||
													"https://placehold.co/600x600?text=Deal.Post"
												}
												alt={listing?.title || "Listing"}
												className="h-full w-full object-cover"
											/>
											<span className="absolute left-3 top-3 rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
												{status}
											</span>
										</div>

										<div className="space-y-2 p-4">
											<div className="flex items-start justify-between gap-2">
												<h3 className="line-clamp-2 text-xl font-display font-bold">
													{listing?.title}
												</h3>
												<p className="font-mono text-xl font-semibold">
													${listing?.price || 0}
												</p>
											</div>

											<p className="line-clamp-2 text-sm text-brand-muted">
												{listing?.description || "No description available."}
											</p>

											<div className="mt-3 flex items-center gap-2">
												<button className="inline-flex h-9 items-center gap-1 rounded-full border border-brand-border px-3 text-xs">
													<Pencil size={12} /> Edit
												</button>

												{status === "sold" ? (
													<button
														type="button"
														onClick={() => updateStatus(id, "active")}
														className="inline-flex h-9 items-center gap-1 rounded-full border border-brand-border px-3 text-xs"
													>
														<RotateCw size={12} /> Re-List
													</button>
												) : (
													<button
														type="button"
														onClick={() => updateStatus(id, "sold")}
														className="inline-flex h-9 items-center gap-1 rounded-full bg-brand-yellow px-3 text-xs font-semibold"
													>
														<Check size={12} /> Sold
													</button>
												)}

												<button
													type="button"
													onClick={() => removeListing(id)}
													className="ml-auto grid h-9 w-9 place-items-center rounded-full text-[#d42d2d]"
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

				<Footer />
			</main>
		</div>
	);
}
