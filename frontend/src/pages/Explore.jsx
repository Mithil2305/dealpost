import { Filter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import { pickArray } from "../utils/api";

const defaultFilters = {
	category: [],
	minPrice: "",
	maxPrice: "",
	condition: "",
	sellerType: [],
	radius: "25km",
	sort: "Newest",
};

export default function Explore() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [categories, setCategories] = useState([]);
	const [filters, setFilters] = useState(defaultFilters);
	const [search, setSearch] = useState(searchParams.get("search") || "");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [showFilters, setShowFilters] = useState(false);

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
		const fetchResults = async () => {
			try {
				setLoading(true);
				const params = {
					category: filters.category.join(",") || undefined,
					minPrice: filters.minPrice || undefined,
					maxPrice: filters.maxPrice || undefined,
					condition: filters.condition || undefined,
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
	}, [filters, search, page]);

	useEffect(() => {
		setSearchParams({
			search,
			sort: filters.sort,
		});
	}, [search, filters.sort, setSearchParams]);

	const hasFilters = useMemo(
		() =>
			Boolean(
				filters.category.length ||
				filters.minPrice ||
				filters.maxPrice ||
				filters.condition ||
				filters.sellerType.length,
			),
		[filters],
	);

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
		<div className="min-h-screen bg-brand-bg">
			<Navbar
				showSearch
				search={search}
				onSearchChange={(value) => {
					setSearch(value);
					setPage(1);
				}}
			/>

			<main className="container-shell py-7">
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

				<div className="grid gap-6 lg:grid-cols-[290px_1fr]">
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
								<p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-muted uppercase">
									Category
								</p>
								<div className="space-y-2">
									{categories.map((category) => {
										const label = category?.name || category;
										return (
											<label
												key={label}
												className="flex items-center gap-2 text-sm text-brand-dark"
											>
												<input
													type="checkbox"
													checked={filters.category.includes(label)}
													onChange={() => toggleArrayFilter("category", label)}
												/>
												{label}
											</label>
										);
									})}
								</div>
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
						<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex h-12 items-center rounded-xl border border-brand-border bg-white px-3 sm:w-[420px]">
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
								className="h-12 rounded-xl border border-brand-border bg-white px-3 text-sm"
								value={filters.sort}
								onChange={(event) =>
									setFilters((prev) => ({ ...prev, sort: event.target.value }))
								}
							>
								<option>Newest</option>
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
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

				<Footer />
			</main>
		</div>
	);
}
