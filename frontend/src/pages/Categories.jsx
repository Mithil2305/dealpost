import { ArrowRight, ChevronRight, Layers3, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import AdSidebar from "../components/ad-sidebar";
import { pickArray } from "../utils/api";

export default function Categories() {
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeMain, setActiveMain] = useState("");

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setLoading(true);
				const { data } = await api.get("/categories");
				setCategories(pickArray(data, ["categories", "data", "items"]));
			} catch {
				toast.error("Unable to load categories");
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	const categoryTree = useMemo(() => {
		const tree = new Map();

		for (const raw of categories) {
			const label = String(raw?.name || raw || "").trim();
			if (!label) continue;

			const parts = label
				.split(">")
				.map((part) => part.trim())
				.filter(Boolean);
			if (!parts.length) continue;

			const main = parts[0];
			if (!tree.has(main)) {
				tree.set(main, new Map());
			}

			if (parts.length === 1) continue;

			const group = parts[1];
			const groupMap = tree.get(main);
			if (!groupMap.has(group)) {
				groupMap.set(group, new Set());
			}

			if (parts.length > 2) {
				groupMap.get(group).add(parts.slice(2).join(" > "));
			}
		}

		return tree;
	}, [categories]);

	const mainCategories = useMemo(
		() => Array.from(categoryTree.keys()),
		[categoryTree],
	);

	useEffect(() => {
		if (!mainCategories.length) return;
		setActiveMain((prev) =>
			prev && mainCategories.includes(prev) ? prev : mainCategories[0],
		);
	}, [mainCategories]);

	const activeGroups = useMemo(() => {
		if (!activeMain || !categoryTree.has(activeMain)) return [];
		const groupMap = categoryTree.get(activeMain);
		return Array.from(groupMap.entries())
			.map(([groupName, childSet]) => ({
				groupName,
				children: Array.from(childSet).sort((a, b) => a.localeCompare(b)),
			}))
			.sort((a, b) => a.groupName.localeCompare(b.groupName));
	}, [activeMain, categoryTree]);

	const topCategories = useMemo(
		() => mainCategories.slice(0, 10),
		[mainCategories],
	);

	return (
		<div className="min-h-screen bg-[#F6F6F6] text-black flex flex-col">
			<Navbar />

			<main
				id="main-content"
				className="flex-1 max-w-[1780px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
			>
				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
					<div className="min-w-0">
						<section className="rounded-[32px] bg-[#111111] px-6 py-10 md:px-10 md:py-14 text-white relative overflow-hidden">
							<div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#FFD600]/20 blur-3xl" />
							<div className="pointer-events-none absolute -left-10 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

							<div className="relative z-10">
								<p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs tracking-[0.15em] uppercase">
									<Sparkles size={12} className="text-[#FFD600]" />
									Live category feed
								</p>
								<h1 className="mt-4 text-4xl font-display font-bold md:text-6xl">
									Browse Categories
								</h1>
								<p className="mt-3 max-w-2xl text-sm md:text-base text-white/70">
									Every category shown here comes directly from your backend
									database. Pick one to instantly explore live listings.
								</p>
							</div>
						</section>

						<section className="mt-6 rounded-[28px] border border-gray-100 bg-white p-5 md:p-7 shadow-sm">
							<div className="mb-5 flex items-center justify-between">
								<h2 className="flex items-center gap-2 text-2xl font-bold">
									<Layers3 size={20} />
									Category Directory
								</h2>
								<p className="text-sm text-[#777777]">
									{mainCategories.length} main
								</p>
							</div>

							{loading ? (
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{Array.from({ length: 9 }).map((_, index) => (
										<div
											key={index}
											className="h-16 animate-pulse rounded-2xl bg-[#F3F3F3]"
										/>
									))}
								</div>
							) : mainCategories.length ? (
								<div className="grid gap-5 md:grid-cols-[280px_1fr]">
									<div className="rounded-2xl border border-gray-100 bg-[#fafafa] p-3">
										<p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
											Main Categories
										</p>
										<div className="space-y-1.5">
											{mainCategories.map((main) => {
												const isActive = main === activeMain;
												return (
													<Link
														key={main}
														to={`/explore?category=${encodeURIComponent(main)}`}
														onMouseEnter={() => setActiveMain(main)}
														className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
															isActive
																? "bg-[#111111] text-white"
																: "bg-white text-black hover:bg-[#fff3c4]"
														}`}
													>
														<span className="font-semibold">{main}</span>
														<ChevronRight
															size={15}
															className={
																isActive ? "text-[#FFD600]" : "text-[#8b8b8b]"
															}
														/>
													</Link>
												);
											})}
										</div>
									</div>

									<div className="rounded-2xl border border-gray-100 bg-white p-4">
										<p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
											Hover panel: {activeMain || "Select a category"}
										</p>

										{activeGroups.length ? (
											<div className="grid gap-3 sm:grid-cols-2">
												{activeGroups.map((group) => {
													const groupPath = `${activeMain} > ${group.groupName}`;
													return (
														<div
															key={group.groupName}
															className="group relative rounded-xl border border-gray-100 bg-[#fcfcfc]"
														>
															<Link
																to={`/explore?category=${encodeURIComponent(groupPath)}`}
																className="flex items-center justify-between px-3 py-3 text-sm"
															>
																<span className="font-semibold">
																	{group.groupName}
																</span>
																<ArrowRight
																	size={14}
																	className="text-[#8a8a8a]"
																/>
															</Link>

															{group.children.length > 0 && (
																<div className="hidden rounded-b-xl border-t border-gray-100 bg-white p-2 group-hover:block">
																	{group.children.map((child) => {
																		const fullPath = `${activeMain} > ${group.groupName} > ${child}`;
																		return (
																			<Link
																				key={fullPath}
																				to={`/explore?category=${encodeURIComponent(fullPath)}`}
																				className="block rounded-lg px-2 py-1.5 text-xs text-[#666666] hover:bg-[#FFF3CF] hover:text-black"
																			>
																				{child}
																			</Link>
																		);
																	})}
																</div>
															)}
														</div>
													);
												})}
											</div>
										) : (
											<div className="rounded-xl border border-dashed border-gray-200 bg-[#fafafa] p-5 text-sm text-[#777777]">
												No nested subcategories available for this main
												category.
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="rounded-2xl border border-dashed border-gray-200 bg-[#FAFAFA] p-8 text-center text-[#777777]">
									No categories found in backend yet.
								</div>
							)}
						</section>

						{topCategories.length > 0 && (
							<section className="mt-6 rounded-[28px] border border-gray-100 bg-white p-5 md:p-7 shadow-sm">
								<h3 className="text-xl font-bold">Main Category Shortcuts</h3>
								<div className="mt-4 flex flex-wrap gap-2">
									{topCategories.map((label) => {
										return (
											<Link
												key={label}
												to={`/explore?category=${encodeURIComponent(label)}`}
												className="rounded-full bg-[#F5F5F5] px-4 py-2 text-sm font-semibold hover:bg-[#FFD600] transition"
											>
												{label}
											</Link>
										);
									})}
								</div>
							</section>
						)}
					</div>

					<AdSidebar side="right" />
				</div>
			</main>

			<Footer />
		</div>
	);
}
