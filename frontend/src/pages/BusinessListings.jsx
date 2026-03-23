import { BriefcaseBusiness, MapPin, Store, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getBusinessProfiles } from "../utils/businessProfiles";
import { pickArray } from "../utils/api";

export default function BusinessListings() {
	const [remoteStores, setRemoteStores] = useState([]);
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);

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
		const localStores = getBusinessProfiles();
		const merged = [...localStores, ...remoteStores];
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

	const getStoreListings = (store) => {
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

			if (businessName && listingBusiness && listingBusiness === businessName) {
				return true;
			}

			if (ownerEmail && sellerEmail && ownerEmail === sellerEmail) {
				return true;
			}

			return false;
		});
	};

	return (
		<div className="min-h-screen bg-brand-bg text-brand-dark">
			<Navbar />

			<main className="container-shell py-8">
				<div className="mb-7 flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
							Marketplace Directory
						</p>
						<h1 className="mt-2 text-5xl font-display font-bold">
							Business Listings
						</h1>
						<p className="mt-2 text-brand-muted">
							Discover stores and browse their latest products in one place.
						</p>
					</div>
					<Link
						to="/signup"
						className="inline-flex h-11 items-center rounded-full bg-brand-yellow px-5 text-sm font-semibold"
					>
						Register Business
					</Link>
				</div>

				{loading ? (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<div
								key={index}
								className="h-72 animate-pulse rounded-3xl bg-white"
							/>
						))}
					</div>
				) : stores.length ? (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{stores.map((store, index) => {
							const storeListings = getStoreListings(store);
							const name =
								store?.businessName || store?.name || `Business ${index + 1}`;

							return (
								<article
									key={
										store?.id ||
										store?._id ||
										store?.email ||
										`${name}-${index}`
									}
									className="rounded-3xl border border-brand-border bg-white p-5"
								>
									<div className="mb-4 flex items-start justify-between gap-3">
										<div className="flex items-center gap-2">
											<div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-bg">
												<Store size={18} />
											</div>
											<div>
												<h2 className="text-xl font-display font-bold">
													{name}
												</h2>
												<p className="text-xs uppercase tracking-[0.15em] text-brand-muted">
													Business Account
												</p>
											</div>
										</div>
										<span className="rounded-full bg-brand-yellow px-3 py-1 text-xs font-semibold">
											{storeListings.length} Listings
										</span>
									</div>

									<div className="space-y-2 text-sm text-brand-muted">
										<p className="inline-flex items-center gap-2">
											<Tag size={14} /> GST/MSME: {store?.gstOrMsme || "-"}
										</p>
										<p className="inline-flex items-center gap-2">
											<MapPin size={14} /> {store?.location || "Not specified"}
										</p>
										<p className="inline-flex items-center gap-2">
											<BriefcaseBusiness size={14} />{" "}
											{store?.email || "No contact email"}
										</p>
									</div>

									<div className="mt-4 space-y-2 rounded-2xl bg-brand-bg p-3">
										<p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-muted">
											Latest Listings
										</p>
										{storeListings.length ? (
											storeListings.slice(0, 3).map((item, itemIndex) => {
												const itemId = item?._id || item?.id;
												return (
													<Link
														key={itemId || itemIndex}
														to={itemId ? `/listing/${itemId}` : "/explore"}
														className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
													>
														<span className="line-clamp-1">
															{item?.title || "Untitled Listing"}
														</span>
														<span className="font-mono font-semibold text-brand-dark">
															${item?.price || 0}
														</span>
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
					<div className="rounded-3xl bg-white p-8 text-center">
						<p className="text-lg font-semibold">
							No business stores available yet.
						</p>
						<p className="mt-2 text-sm text-brand-muted">
							Create a Business profile from signup to appear here instantly.
						</p>
					</div>
				)}
			</main>

			<Footer />
		</div>
	);
}
