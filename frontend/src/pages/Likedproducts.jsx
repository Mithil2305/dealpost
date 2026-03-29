import { Heart, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";

export default function Likedproducts() {
	const [search, setSearch] = useState("");
	const [likedListings, setLikedListings] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		const fetchLikedListings = async () => {
			try {
				setLoading(true);
				const { data } = await api.get("/listings/liked/my");
				const rows = Array.isArray(data?.listings) ? data.listings : [];
				if (active) {
					setLikedListings(rows);
				}
			} catch {
				if (active) {
					setLikedListings([]);
					toast.error("Could not load liked products");
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		fetchLikedListings();

		return () => {
			active = false;
		};
	}, []);

	const filteredListings = useMemo(() => {
		const keyword = String(search || "")
			.trim()
			.toLowerCase();
		if (!keyword) return likedListings;

		return likedListings.filter((listing) => {
			const title = String(listing?.title || "").toLowerCase();
			const category = String(listing?.category || "").toLowerCase();
			const location = String(
				listing?.location?.name || listing?.location || listing?.city || "",
			).toLowerCase();
			return (
				title.includes(keyword) ||
				category.includes(keyword) ||
				location.includes(keyword)
			);
		});
	}, [likedListings, search]);

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar showSearch search={search} onSearchChange={setSearch} />

			<main className="container-shell py-6 flex-1">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-5xl font-display font-bold text-black">
							Liked Products
						</h1>
						<p className="mt-2 text-brand-muted">
							All products you have liked in one place.
						</p>
					</div>
					<div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1E1E38] shadow-sm">
						<Heart size={16} className="fill-[#1E1E38] text-[#1E1E38]" />
						{likedListings.length} Saved
					</div>
				</div>

				<div className="mt-6 rounded-3xl border border-brand-border bg-white p-4 sm:p-5">
					<div className="mb-5 flex h-11 items-center rounded-full bg-brand-bg px-3 sm:w-80">
						<Search size={15} className="text-brand-muted" />
						<input
							className="ml-2 w-full border-none bg-transparent text-sm outline-none"
							placeholder="Search liked products..."
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>

					{loading ? (
						<div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
							{Array.from({ length: 4 }).map((_, index) => (
								<div
									key={index}
									className="h-[360px] animate-pulse rounded-2xl bg-brand-bg"
								/>
							))}
						</div>
					) : filteredListings.length ? (
						<div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
							{filteredListings.map((listing) => (
								<ProductCard
									key={listing?.id || listing?._id || listing?.productId}
									listing={listing}
								/>
							))}
						</div>
					) : (
						<div className="deal-card grid h-56 place-items-center text-center text-brand-muted">
							<div>
								<p className="text-lg font-semibold text-[#1E1E38]">
									No liked products found
								</p>
								<p className="mt-1 text-sm">
									Like products from Home, Explore, or Product pages to see them
									here.
								</p>
							</div>
						</div>
					)}
				</div>
			</main>

			<Footer />
		</div>
	);
}
