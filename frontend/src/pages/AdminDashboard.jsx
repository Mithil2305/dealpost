import {
	Ban,
	Bell,
	Pencil,
	Search,
	SlidersHorizontal,
	TriangleAlert,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";

export default function AdminDashboard() {
	const { user } = useAuth();
	const [stats, setStats] = useState(null);
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchAdminData = async () => {
			try {
				setLoading(true);
				const [statsRes, reportsRes] = await Promise.all([
					api.get("/admin/stats"),
					api.get("/admin/reports"),
				]);

				setStats(statsRes?.data?.stats || statsRes?.data);
				const normalizedReports = pickArray(reportsRes?.data, ["reports"]);
				setReports(normalizedReports);
			} catch {
				toast.error("Unable to load admin dashboard");
			} finally {
				setLoading(false);
			}
		};

		fetchAdminData();
	}, []);

	const dismissListing = async (id) => {
		try {
			await api.delete(`/admin/listings/${id}`);
			setReports((prev) =>
				prev.filter((item) => (item?.listing?._id || item?.listing?.id) !== id),
			);
			toast.success("Listing removed");
		} catch {
			toast.error("Failed to remove listing");
		}
	};

	const banUser = async (id) => {
		try {
			await api.post(`/admin/users/${id}/ban`);
			toast.success("User banned successfully");
		} catch {
			toast.error("Unable to ban user");
		}
	};

	const statCards = [
		{
			title: "Total Users",
			value: stats?.usersTotal,
			detail: stats?.usersGrowth || "+0% this month",
		},
		{
			title: "Active Ads",
			value: stats?.activeAds,
			detail: stats?.activeAdsToday || "0 listed today",
		},
		{
			title: "Pending Reports",
			value: stats?.pendingReports,
			detail: "Urgent action required",
			warning: true,
		},
	];

	return (
		<div className="min-h-screen bg-[#111111] text-white">
			<div className="mx-auto flex max-w-[1500px]">
				<AdminSidebar admin={user} />

				<main className="min-h-screen flex-1 p-5 sm:p-7">
					<header className="mb-6 flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-5xl font-display font-bold">
								System Overview
							</h1>
							<p className="text-white/55">
								Real-time marketplace monitoring and moderation.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<button className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
								<Bell size={16} className="text-brand-yellow" />
							</button>
							<button className="btn-primary">Start Listing</button>
						</div>
					</header>

					{loading ? (
						<div className="grid gap-4 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, index) => (
								<div
									key={index}
									className="h-32 animate-pulse rounded-3xl bg-white/5"
								/>
							))}
						</div>
					) : (
						<section className="grid gap-4 lg:grid-cols-3">
							{statCards.map((card) => (
								<article
									key={card.title}
									className={`rounded-3xl border p-5 ${
										card.warning
											? "border-brand-yellow bg-brand-yellow text-brand-dark"
											: "border-white/10 bg-[#1a1a1a]"
									}`}
								>
									<p
										className={`text-xs tracking-[0.2em] uppercase ${card.warning ? "text-brand-dark/70" : "text-white/50"}`}
									>
										{card.title}
									</p>
									<p className="mt-2 font-mono text-5xl font-semibold">
										{card.value || 0}
									</p>
									<p
										className={`mt-3 text-sm ${card.warning ? "text-brand-dark/70" : "text-brand-yellow"}`}
									>
										{card.warning && (
											<TriangleAlert size={13} className="mr-1 inline" />
										)}{" "}
										{card.detail}
									</p>
								</article>
							))}
						</section>
					)}

					<section className="mt-6 rounded-3xl border border-white/10 bg-[#171717]">
						<div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
							<h2 className="text-3xl font-display font-bold">
								Recently Flagged Ads
							</h2>
							<div className="flex items-center gap-2">
								<button className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
									<SlidersHorizontal size={16} />
								</button>
								<button className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
									<Search size={16} />
								</button>
							</div>
						</div>

						<div className="overflow-x-auto">
							<table className="min-w-full text-left text-sm">
								<thead className="text-xs uppercase tracking-[0.12em] text-white/45">
									<tr>
										<th className="px-5 py-4">Ad Title</th>
										<th className="px-5 py-4">Seller</th>
										<th className="px-5 py-4">Report Reason</th>
										<th className="px-5 py-4 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{reports.length ? (
										reports.map((report) => {
											const listingId =
												report?.listing?._id || report?.listing?.id;
											const sellerId =
												report?.seller?._id || report?.seller?.id;

											return (
												<tr
													key={report?._id || listingId}
													className="border-t border-white/10"
												>
													<td className="px-5 py-3">
														<div className="flex items-center gap-3">
															<img
																src={
																	report?.listing?.images?.[0]?.url ||
																	report?.listing?.image ||
																	"https://placehold.co/70x70?text=Ad"
																}
																alt={report?.listing?.title || "Listing"}
																className="h-12 w-12 rounded-full object-cover"
															/>
															<div>
																<p className="font-semibold">
																	{report?.listing?.title || "Untitled"}
																</p>
															</div>
														</div>
													</td>
													<td className="px-5 py-3">
														<p className="font-semibold">
															{report?.seller?.name || "Unknown"}
														</p>
														<p className="text-xs text-white/50">
															ID: {sellerId || "-"}
														</p>
													</td>
													<td className="px-5 py-3">
														<span className="rounded-full bg-[#2f1c1c] px-3 py-1 text-xs text-[#f19f9f]">
															{report?.reason || "Suspicious activity"}
														</span>
													</td>
													<td className="px-5 py-3">
														<div className="flex justify-end gap-2">
															<button className="grid h-10 w-10 place-items-center rounded-full border border-brand-yellow/40 bg-brand-yellow/10 text-brand-yellow">
																<Pencil size={14} />
															</button>
															<button
																type="button"
																onClick={() => dismissListing(listingId)}
																className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-[#f58f8f]"
															>
																<X size={14} />
															</button>
															<button
																type="button"
																onClick={() => banUser(sellerId)}
																className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ad2222] px-4 text-xs font-semibold"
															>
																<Ban size={14} /> Ban User
															</button>
														</div>
													</td>
												</tr>
											);
										})
									) : (
										<tr>
											<td className="px-5 py-7 text-white/60" colSpan={4}>
												No flagged ads right now.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						<div className="flex items-center justify-end gap-4 px-5 py-4 text-sm text-white/60">
							<button>Previous</button>
							<button className="grid h-7 w-7 place-items-center rounded-full bg-brand-yellow font-semibold text-brand-dark">
								1
							</button>
							<button>2</button>
							<button>3</button>
							<button>Next</button>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}
