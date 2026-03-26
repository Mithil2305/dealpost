import {
	Ban,
	Bell,
	CheckCircle2,
	Eye,
	LoaderCircle,
	Pencil,
	Plus,
	Search,
	SlidersHorizontal,
	Trash2,
	TriangleAlert,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";
import {
	createAdminSponsoredAd,
	deleteAdminSponsoredAd,
	getAdminGoogleAdsSnippet,
	getAdminSponsoredAds,
	saveAdminGoogleAdsSnippet,
	updateAdminSponsoredAd,
} from "../utils/sponsoredAds";

const REPORT_PAGE_SIZE = 8;
const USERS_PAGE_SIZE = 10;
const LISTINGS_PAGE_SIZE = 10;
const SPONSORED_PAGE_SIZE = 10;

const formatDate = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleDateString();
};

export default function AdminDashboard() {
	const { user, setCurrentUser } = useAuth();

	const [activeSection, setActiveSection] = useState("dashboard");
	const [actionKey, setActionKey] = useState("");

	const [stats, setStats] = useState(null);
	const [loadingStats, setLoadingStats] = useState(true);

	const [reports, setReports] = useState([]);
	const [reportsTotal, setReportsTotal] = useState(0);
	const [loadingReports, setLoadingReports] = useState(true);
	const [reportStatus, setReportStatus] = useState("pending");
	const [reportSearch, setReportSearch] = useState("");
	const [reportPage, setReportPage] = useState(1);

	const [users, setUsers] = useState([]);
	const [usersTotal, setUsersTotal] = useState(0);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [userSearch, setUserSearch] = useState("");
	const [userPage, setUserPage] = useState(1);

	const [listings, setListings] = useState([]);
	const [listingsTotal, setListingsTotal] = useState(0);
	const [loadingListings, setLoadingListings] = useState(false);
	const [listingStatus, setListingStatus] = useState("all");
	const [listingSearch, setListingSearch] = useState("");
	const [listingPage, setListingPage] = useState(1);

	const [categories, setCategories] = useState([]);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newCategoryIcon, setNewCategoryIcon] = useState("");
	const [newCategoryColor, setNewCategoryColor] = useState("");
	const [editingCategoryId, setEditingCategoryId] = useState(null);
	const [editingCategoryName, setEditingCategoryName] = useState("");
	const [editingCategoryIcon, setEditingCategoryIcon] = useState("");
	const [editingCategoryColor, setEditingCategoryColor] = useState("");

	const [adminProfileForm, setAdminProfileForm] = useState({
		name: user?.name || "",
		phone: user?.phone || "",
		location: user?.location || "",
	});
	const [sponsoredAds, setSponsoredAds] = useState([]);
	const [sponsoredTotal, setSponsoredTotal] = useState(0);
	const [sponsoredPage, setSponsoredPage] = useState(1);
	const [sponsoredStatus, setSponsoredStatus] = useState("all");
	const [sponsoredSearch, setSponsoredSearch] = useState("");
	const [loadingSponsored, setLoadingSponsored] = useState(false);
	const [googleAdsSnippet, setGoogleAdsSnippet] = useState("");
	const [sponsoredForm, setSponsoredForm] = useState({
		title: "",
		description: "",
		imageUrl: "",
		targetUrl: "",
		placement: "any",
		isActive: true,
		status: "approved",
		reviewNotes: "",
	});
	const [editingSponsoredId, setEditingSponsoredId] = useState(null);

	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const { data } = await api.get("/admin/stats");
			setStats(data?.stats || data);
		} catch {
			toast.error("Unable to load dashboard stats");
		} finally {
			setLoadingStats(false);
		}
	}, []);

	const fetchReports = useCallback(async () => {
		try {
			setLoadingReports(true);
			const { data } = await api.get("/admin/reports", {
				params: {
					page: reportPage,
					limit: REPORT_PAGE_SIZE,
					status: reportStatus,
				},
			});
			setReports(pickArray(data, ["reports"]));
			setReportsTotal(Number(data?.total) || 0);
		} catch {
			toast.error("Unable to load reports");
		} finally {
			setLoadingReports(false);
		}
	}, [reportPage, reportStatus]);

	const fetchUsers = useCallback(async () => {
		try {
			setLoadingUsers(true);
			const { data } = await api.get("/admin/users", {
				params: {
					page: userPage,
					limit: USERS_PAGE_SIZE,
					search: userSearch.trim() || undefined,
				},
			});
			setUsers(pickArray(data, ["users"]));
			setUsersTotal(Number(data?.total) || 0);
		} catch {
			toast.error("Unable to load users");
		} finally {
			setLoadingUsers(false);
		}
	}, [userPage, userSearch]);

	const fetchListings = useCallback(async () => {
		try {
			setLoadingListings(true);
			const { data } = await api.get("/admin/listings", {
				params: {
					page: listingPage,
					limit: LISTINGS_PAGE_SIZE,
					status: listingStatus === "all" ? undefined : listingStatus,
					search: listingSearch.trim() || undefined,
				},
			});
			setListings(pickArray(data, ["listings"]));
			setListingsTotal(Number(data?.total) || 0);
		} catch {
			toast.error("Unable to load listings");
		} finally {
			setLoadingListings(false);
		}
	}, [listingPage, listingSearch, listingStatus]);

	const fetchCategories = useCallback(async () => {
		try {
			setLoadingCategories(true);
			const { data } = await api.get("/admin/categories");
			setCategories(pickArray(data, ["categories"]));
		} catch {
			toast.error("Unable to load categories");
		} finally {
			setLoadingCategories(false);
		}
	}, []);

	const fetchSponsoredAds = useCallback(async () => {
		try {
			setLoadingSponsored(true);
			const data = await getAdminSponsoredAds({
				page: sponsoredPage,
				limit: SPONSORED_PAGE_SIZE,
				status: sponsoredStatus,
				search: sponsoredSearch.trim() || undefined,
			});
			setSponsoredAds(Array.isArray(data?.ads) ? data.ads : []);
			setSponsoredTotal(Number(data?.total) || 0);
		} catch {
			toast.error("Unable to load sponsored ads");
		} finally {
			setLoadingSponsored(false);
		}
	}, [sponsoredPage, sponsoredSearch, sponsoredStatus]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		if (activeSection === "dashboard" || activeSection === "reports") {
			fetchReports();
		}
	}, [activeSection, fetchReports]);

	useEffect(() => {
		if (activeSection === "users") {
			fetchUsers();
		}
	}, [activeSection, fetchUsers]);

	useEffect(() => {
		if (activeSection === "ads") {
			fetchListings();
		}
	}, [activeSection, fetchListings]);

	useEffect(() => {
		if (activeSection === "categories") {
			fetchCategories();
		}
	}, [activeSection, fetchCategories]);

	useEffect(() => {
		if (activeSection === "sponsored") {
			fetchSponsoredAds();
			getAdminGoogleAdsSnippet()
				.then((snippet) => setGoogleAdsSnippet(snippet))
				.catch(() => setGoogleAdsSnippet(""));
		}
	}, [activeSection, fetchSponsoredAds]);

	useEffect(() => {
		setReportPage(1);
	}, [reportStatus]);

	useEffect(() => {
		setListingPage(1);
	}, [listingSearch]);

	useEffect(() => {
		setSponsoredPage(1);
	}, [sponsoredSearch, sponsoredStatus]);

	useEffect(() => {
		setAdminProfileForm({
			name: user?.name || "",
			phone: user?.phone || "",
			location: user?.location || "",
		});
	}, [user]);

	const filteredReports = useMemo(() => {
		const query = reportSearch.trim().toLowerCase();
		if (!query) return reports;
		return reports.filter((report) => {
			const target = [
				report?.listing?.title,
				report?.seller?.name,
				report?.reporter?.name,
				report?.reason,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return target.includes(query);
		});
	}, [reportSearch, reports]);

	const runAction = async (key, fn) => {
		try {
			setActionKey(key);
			await fn();
		} finally {
			setActionKey("");
		}
	};

	const dismissListing = async (id) => {
		if (!id) return;
		try {
			await runAction(`dismiss-listing-${id}`, async () => {
				await api.delete(`/admin/listings/${id}`);
				setReports((prev) =>
					prev.filter((item) => Number(item?.listing?.id) !== Number(id)),
				);
				setListings((prev) =>
					prev.filter((item) => Number(item?.id) !== Number(id)),
				);
			});
			setReportsTotal((prev) => Math.max(prev - 1, 0));
			setListingsTotal((prev) => Math.max(prev - 1, 0));
			toast.success("Listing removed and report dismissed");
		} catch {
			toast.error("Failed to remove listing");
		}
	};

	const updateReportStatus = async (reportId, nextStatus) => {
		if (!reportId) return;
		try {
			await runAction(`report-${reportId}-${nextStatus}`, async () => {
				await api.patch(`/admin/reports/${reportId}/status`, {
					status: nextStatus,
				});
			});
			toast.success(`Report marked as ${nextStatus}`);
			fetchReports();
		} catch {
			toast.error("Failed to update report status");
		}
	};

	const banUser = async (id) => {
		if (!id) return;
		try {
			await runAction(`ban-user-${id}`, async () => {
				await api.post(`/admin/users/${id}/ban`);
				setUsers((prev) =>
					prev.map((entry) =>
						Number(entry.id) === Number(id)
							? { ...entry, isActive: false }
							: entry,
					),
				);
			});
			toast.success("User banned successfully");
		} catch {
			toast.error("Unable to ban user");
		}
	};

	const toggleUserStatus = async (id) => {
		if (!id) return;
		try {
			await runAction(`toggle-user-${id}`, async () => {
				const { data } = await api.patch(`/admin/users/${id}/status`);
				const updated = data?.user;
				if (!updated) return;
				setUsers((prev) =>
					prev.map((entry) =>
						Number(entry.id) === Number(id) ? { ...entry, ...updated } : entry,
					),
				);
			});
			toast.success("User status updated");
		} catch {
			toast.error("Unable to update user status");
		}
	};

	const changeListingStatus = async (id, nextStatus) => {
		if (!id) return;
		try {
			await runAction(`listing-status-${id}`, async () => {
				await api.patch(`/admin/listings/${id}/status`, { status: nextStatus });
				setListings((prev) =>
					prev.map((entry) =>
						Number(entry.id) === Number(id)
							? { ...entry, status: nextStatus }
							: entry,
					),
				);
			});
			toast.success("Listing status updated");
		} catch {
			toast.error("Could not update listing status");
		}
	};

	const createCategory = async () => {
		const name = newCategoryName.trim();
		if (name.length < 2) {
			toast.error("Category name must be at least 2 characters");
			return;
		}

		try {
			await runAction("create-category", async () => {
				const { data } = await api.post("/admin/categories", {
					name,
					icon: newCategoryIcon.trim() || null,
					color: newCategoryColor.trim() || null,
				});

				const created = data?.category;
				if (created) {
					setCategories((prev) => [created, ...prev]);
				}
			});

			setNewCategoryName("");
			setNewCategoryIcon("");
			setNewCategoryColor("");
			toast.success("Category created");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Could not create category",
			);
		}
	};

	const startCategoryEdit = (category) => {
		setEditingCategoryId(category?.id || null);
		setEditingCategoryName(category?.name || "");
		setEditingCategoryIcon(category?.icon || "");
		setEditingCategoryColor(category?.color || "");
	};

	const saveCategoryEdit = async () => {
		if (!editingCategoryId) return;
		const name = editingCategoryName.trim();
		if (name.length < 2) {
			toast.error("Category name must be at least 2 characters");
			return;
		}

		try {
			await runAction(`update-category-${editingCategoryId}`, async () => {
				const { data } = await api.patch(
					`/admin/categories/${editingCategoryId}`,
					{
						name,
						icon: editingCategoryIcon.trim() || null,
						color: editingCategoryColor.trim() || null,
					},
				);

				const updated = data?.category;
				if (updated) {
					setCategories((prev) =>
						prev.map((category) =>
							Number(category.id) === Number(updated.id) ? updated : category,
						),
					);
				}
			});

			setEditingCategoryId(null);
			setEditingCategoryName("");
			setEditingCategoryIcon("");
			setEditingCategoryColor("");
			toast.success("Category updated");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Could not update category",
			);
		}
	};

	const deleteCategory = async (id) => {
		if (!id) return;
		try {
			await runAction(`delete-category-${id}`, async () => {
				await api.delete(`/admin/categories/${id}`);
				setCategories((prev) =>
					prev.filter((category) => Number(category.id) !== Number(id)),
				);
			});
			toast.success("Category deleted");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Could not delete category",
			);
		}
	};

	const saveAdminProfile = async (event) => {
		event.preventDefault();
		if (!adminProfileForm.name.trim()) {
			toast.error("Name is required");
			return;
		}

		try {
			await runAction("save-admin-profile", async () => {
				const { data } = await api.put("/users/me", adminProfileForm);
				setCurrentUser(data?.user || user);
			});
			toast.success("Profile updated");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update profile");
		}
	};

	const resetSponsoredForm = () => {
		setSponsoredForm({
			title: "",
			description: "",
			imageUrl: "",
			targetUrl: "",
			placement: "any",
			isActive: true,
			status: "approved",
			reviewNotes: "",
		});
		setEditingSponsoredId(null);
	};

	const saveSponsoredAd = async (event) => {
		event.preventDefault();
		if (sponsoredForm.title.trim().length < 3) {
			toast.error("Ad title must be at least 3 characters");
			return;
		}
		if (!sponsoredForm.imageUrl.trim()) {
			toast.error("Ad image URL is required");
			return;
		}

		try {
			if (editingSponsoredId) {
				await runAction(`sponsored-update-${editingSponsoredId}`, async () => {
					await updateAdminSponsoredAd(editingSponsoredId, sponsoredForm);
				});
				toast.success("Sponsored ad updated");
			} else {
				await runAction("sponsored-create", async () => {
					await createAdminSponsoredAd(sponsoredForm);
				});
				toast.success("Sponsored ad created");
			}
			resetSponsoredForm();
			fetchSponsoredAds();
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to save sponsored ad",
			);
		}
	};

	const startSponsoredEdit = (entry) => {
		setEditingSponsoredId(entry?.id || null);
		setSponsoredForm({
			title: entry?.title || "",
			description: entry?.description || "",
			imageUrl: entry?.imageUrl || "",
			targetUrl: entry?.targetUrl || "",
			placement: entry?.placement || "any",
			isActive: Boolean(entry?.isActive),
			status: entry?.status || "approved",
			reviewNotes: entry?.reviewNotes || "",
		});
	};

	const removeSponsoredAd = async (id) => {
		if (!id) return;
		try {
			await runAction(`sponsored-delete-${id}`, async () => {
				await deleteAdminSponsoredAd(id);
			});
			toast.success("Sponsored ad deleted");
			fetchSponsoredAds();
		} catch {
			toast.error("Unable to delete sponsored ad");
		}
	};

	const updateSponsoredStatus = async (entry, status) => {
		if (!entry?.id) return;
		try {
			await runAction(`sponsored-status-${entry.id}`, async () => {
				await updateAdminSponsoredAd(entry.id, { status });
			});
			toast.success("Sponsored ad status updated");
			fetchSponsoredAds();
		} catch {
			toast.error("Unable to update sponsored ad status");
		}
	};

	const saveGoogleSnippet = async (event) => {
		event.preventDefault();
		try {
			await runAction("google-snippet-save", async () => {
				const snippet = await saveAdminGoogleAdsSnippet(googleAdsSnippet);
				setGoogleAdsSnippet(snippet);
			});
			toast.success("Google Ads snippet saved");
		} catch {
			toast.error("Unable to save Google Ads snippet");
		}
	};

	const reportPages = Math.max(Math.ceil(reportsTotal / REPORT_PAGE_SIZE), 1);
	const userPages = Math.max(Math.ceil(usersTotal / USERS_PAGE_SIZE), 1);
	const listingPages = Math.max(
		Math.ceil(listingsTotal / LISTINGS_PAGE_SIZE),
		1,
	);
	const sponsoredPages = Math.max(
		Math.ceil(sponsoredTotal / SPONSORED_PAGE_SIZE),
		1,
	);

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
		<div className="min-h-screen bg-[#F5F7FB] text-gray-900">
			<div className="mx-auto flex max-w-[1500px]">
				<AdminSidebar
					admin={user}
					activeSection={activeSection}
					onSectionChange={setActiveSection}
				/>

				<main className="min-h-screen flex-1 p-5 sm:p-7">
					<header className="mb-6 flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-4xl font-display font-bold sm:text-5xl">
								Admin Dashboard
							</h1>
						</div>
						<div className="flex items-center gap-2">
							<button className="rounded-full bg-[#FFF5D1] px-4 py-2 text-sm font-bold text-[#5C4D00]">
								{activeSection[0].toUpperCase() + activeSection.slice(1)}
							</button>
						</div>
					</header>

					{activeSection === "dashboard" && (
						<>
							{loadingStats ? (
								<div className="grid gap-4 lg:grid-cols-3">
									{Array.from({ length: 3 }).map((_, index) => (
										<div
											key={index}
											className="h-32 animate-pulse rounded-3xl border border-gray-200 bg-white"
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
													? "border-[#E9C54F] bg-[#FFF5D1] text-[#5C4D00]"
													: "border-gray-200 bg-white"
											}`}
										>
											<p
												className={`text-xs tracking-[0.2em] uppercase ${card.warning ? "text-[#5C4D00]/70" : "text-gray-500"}`}
											>
												{card.title}
											</p>
											<p className="mt-2 font-mono text-5xl font-semibold text-gray-900">
												{card.value || 0}
											</p>
											<p
												className={`mt-3 text-sm ${card.warning ? "text-[#5C4D00]/75" : "text-[#A47C00]"}`}
											>
												{card.warning && (
													<TriangleAlert size={13} className="mr-1 inline" />
												)}
												{card.detail}
											</p>
										</article>
									))}
								</section>
							)}
						</>
					)}

					{(activeSection === "dashboard" || activeSection === "reports") && (
						<section className="mt-6 rounded-3xl border border-gray-200 bg-white">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
								<h2 className="text-2xl font-display font-bold text-gray-900">
									Moderation Reports
								</h2>
								<div className="flex flex-wrap items-center gap-2">
									<select
										value={reportStatus}
										onChange={(event) => setReportStatus(event.target.value)}
										className="h-10 rounded-full border border-gray-200 bg-white px-3 text-sm text-gray-700"
									>
										<option value="pending">Pending</option>
										<option value="reviewed">Reviewed</option>
										<option value="dismissed">Dismissed</option>
										<option value="all">All</option>
									</select>
									<div className="flex items-center rounded-full border border-gray-200 bg-white px-3">
										<Search size={14} className="text-gray-400" />
										<input
											value={reportSearch}
											onChange={(event) => setReportSearch(event.target.value)}
											placeholder="Search reports"
											className="h-10 w-40 bg-transparent px-2 text-sm outline-none"
										/>
									</div>
									<button className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white text-gray-600">
										<SlidersHorizontal size={16} />
									</button>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
										<tr>
											<th className="px-5 py-4">Ad Title</th>
											<th className="px-5 py-4">Seller</th>
											<th className="px-5 py-4">Reason</th>
											<th className="px-5 py-4">Status</th>
											<th className="px-5 py-4 text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{loadingReports ? (
											<tr>
												<td className="px-5 py-7 text-gray-500" colSpan={5}>
													Loading reports...
												</td>
											</tr>
										) : filteredReports.length ? (
											filteredReports.map((report) => {
												const listingId = report?.listing?.id;
												const sellerId = report?.seller?.id;
												const reportId = report?.id;
												const reportActionBusy = actionKey.includes(
													`report-${reportId}`,
												);

												return (
													<tr
														key={reportId}
														className="border-t border-gray-100"
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
																	className="h-12 w-12 rounded-xl object-cover"
																/>
																<div>
																	<p className="font-semibold text-gray-900">
																		{report?.listing?.title || "Untitled"}
																	</p>
																	<p className="text-xs text-gray-500">
																		Reported on {formatDate(report?.createdAt)}
																	</p>
																</div>
															</div>
														</td>
														<td className="px-5 py-3">
															<p className="font-semibold text-gray-900">
																{report?.seller?.name || "Unknown"}
															</p>
															<p className="text-xs text-gray-500">
																{report?.seller?.email || "-"}
															</p>
														</td>
														<td className="px-5 py-3">
															<span className="rounded-full bg-[#FFF1F1] px-3 py-1 text-xs text-[#A33B3B]">
																{report?.reason || "Suspicious activity"}
															</span>
														</td>
														<td className="px-5 py-3">
															<span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold capitalize text-gray-700">
																{report?.status || "pending"}
															</span>
														</td>
														<td className="px-5 py-3">
															<div className="flex justify-end gap-2">
																<button
																	type="button"
																	disabled={reportActionBusy}
																	onClick={() =>
																		updateReportStatus(reportId, "reviewed")
																	}
																	className="inline-flex h-9 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-700 disabled:opacity-60"
																>
																	<CheckCircle2 size={13} /> Review
																</button>
																<button
																	type="button"
																	disabled={reportActionBusy}
																	onClick={() => dismissListing(listingId)}
																	className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-[#D45050] disabled:opacity-60"
																>
																	<X size={14} />
																</button>
																<button
																	type="button"
																	disabled={
																		actionKey === `ban-user-${sellerId}`
																	}
																	onClick={() => banUser(sellerId)}
																	className="inline-flex h-9 items-center gap-2 rounded-full bg-[#D84C4C] px-3 text-xs font-semibold text-white disabled:opacity-60"
																>
																	{actionKey === `ban-user-${sellerId}` ? (
																		<LoaderCircle
																			size={13}
																			className="animate-spin"
																		/>
																	) : (
																		<Ban size={13} />
																	)}
																	Ban User
																</button>
															</div>
														</td>
													</tr>
												);
											})
										) : (
											<tr>
												<td className="px-5 py-7 text-gray-500" colSpan={5}>
													No reports found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>

							<div className="flex items-center justify-end gap-3 px-5 py-4 text-sm text-gray-600">
								<button
									type="button"
									disabled={reportPage === 1 || loadingReports}
									onClick={() => setReportPage((prev) => Math.max(prev - 1, 1))}
									className="disabled:opacity-50"
								>
									Previous
								</button>
								<span className="rounded-full bg-[#FFF5D1] px-3 py-1 text-xs font-semibold text-[#5C4D00]">
									Page {reportPage} / {reportPages}
								</span>
								<button
									type="button"
									disabled={reportPage >= reportPages || loadingReports}
									onClick={() => setReportPage((prev) => prev + 1)}
									className="disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</section>
					)}

					{activeSection === "users" && (
						<section className="rounded-3xl border border-gray-200 bg-white p-5">
							<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
								<h2 className="text-2xl font-display font-bold">Users</h2>
								<div className="flex items-center rounded-full border border-gray-200 bg-white px-3">
									<Search size={14} className="text-gray-400" />
									<input
										value={userSearch}
										onChange={(event) => {
											setUserSearch(event.target.value);
											setUserPage(1);
										}}
										onBlur={fetchUsers}
										placeholder="Search user by name/email"
										className="h-10 w-64 bg-transparent px-2 text-sm outline-none"
									/>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
										<tr>
											<th className="px-3 py-3">Name</th>
											<th className="px-3 py-3">Email</th>
											<th className="px-3 py-3">Role</th>
											<th className="px-3 py-3">Status</th>
											<th className="px-3 py-3 text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{loadingUsers ? (
											<tr>
												<td className="px-3 py-6 text-gray-500" colSpan={5}>
													Loading users...
												</td>
											</tr>
										) : users.length ? (
											users.map((entry) => (
												<tr key={entry.id} className="border-t border-gray-100">
													<td className="px-3 py-3 font-medium text-gray-900">
														{entry.name}
													</td>
													<td className="px-3 py-3 text-gray-600">
														{entry.email}
													</td>
													<td className="px-3 py-3 capitalize text-gray-600">
														{entry.role}
													</td>
													<td className="px-3 py-3">
														<span
															className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
														>
															{entry.isActive ? "Active" : "Banned"}
														</span>
													</td>
													<td className="px-3 py-3">
														<div className="flex justify-end gap-2">
															<button
																type="button"
																disabled={
																	actionKey === `toggle-user-${entry.id}`
																}
																onClick={() => toggleUserStatus(entry.id)}
																className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 disabled:opacity-60"
															>
																{entry.isActive ? "Deactivate" : "Activate"}
															</button>
															<button
																type="button"
																disabled={
																	actionKey === `ban-user-${entry.id}` ||
																	!entry.isActive
																}
																onClick={() => banUser(entry.id)}
																className="rounded-full bg-[#D84C4C] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
															>
																Ban
															</button>
														</div>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td className="px-3 py-6 text-gray-500" colSpan={5}>
													No users found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
							<div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-600">
								<button
									type="button"
									disabled={userPage === 1 || loadingUsers}
									onClick={() => setUserPage((prev) => Math.max(prev - 1, 1))}
									className="disabled:opacity-50"
								>
									Previous
								</button>
								<span>
									Page {userPage} / {userPages}
								</span>
								<button
									type="button"
									disabled={userPage >= userPages || loadingUsers}
									onClick={() => setUserPage((prev) => prev + 1)}
									className="disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</section>
					)}

					{activeSection === "ads" && (
						<section className="rounded-3xl border border-gray-200 bg-white p-5">
							<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
								<h2 className="text-2xl font-display font-bold">Ads</h2>
								<div className="flex flex-wrap items-center gap-2">
									<select
										value={listingStatus}
										onChange={(event) => {
											setListingStatus(event.target.value);
											setListingPage(1);
										}}
										className="h-10 rounded-full border border-gray-200 bg-white px-3 text-sm"
									>
										<option value="all">All Statuses</option>
										<option value="active">Active</option>
										<option value="pending">Pending</option>
										<option value="sold">Sold</option>
										<option value="removed">Removed</option>
									</select>
									<div className="flex items-center rounded-full border border-gray-200 bg-white px-3">
										<Search size={14} className="text-gray-400" />
										<input
											value={listingSearch}
											onChange={(event) => setListingSearch(event.target.value)}
											placeholder="Search ads"
											className="h-10 w-48 bg-transparent px-2 text-sm outline-none"
										/>
									</div>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
										<tr>
											<th className="px-3 py-3">Title</th>
											<th className="px-3 py-3">Seller</th>
											<th className="px-3 py-3">Status</th>
											<th className="px-3 py-3">Created</th>
											<th className="px-3 py-3 text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{loadingListings ? (
											<tr>
												<td className="px-3 py-6 text-gray-500" colSpan={5}>
													Loading listings...
												</td>
											</tr>
										) : listings.length ? (
											listings.map((entry) => (
												<tr key={entry.id} className="border-t border-gray-100">
													<td className="px-3 py-3">
														<p className="font-semibold text-gray-900">
															{entry.title}
														</p>
														<p className="text-xs text-gray-500">
															{entry.productId || "-"}
														</p>
													</td>
													<td className="px-3 py-3 text-gray-600">
														{entry?.seller?.name || "Unknown"}
													</td>
													<td className="px-3 py-3">
														<select
															value={entry.status || "active"}
															onChange={(event) =>
																changeListingStatus(
																	entry.id,
																	event.target.value,
																)
															}
															disabled={
																actionKey === `listing-status-${entry.id}`
															}
															className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
														>
															<option value="active">active</option>
															<option value="pending">pending</option>
															<option value="sold">sold</option>
															<option value="removed">removed</option>
														</select>
													</td>
													<td className="px-3 py-3 text-gray-600">
														{formatDate(entry.createdAt)}
													</td>
													<td className="px-3 py-3">
														<div className="flex justify-end">
															<button
																type="button"
																disabled={
																	actionKey === `dismiss-listing-${entry.id}`
																}
																onClick={() => dismissListing(entry.id)}
																className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 disabled:opacity-60"
															>
																Remove
															</button>
														</div>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td className="px-3 py-6 text-gray-500" colSpan={5}>
													No listings found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>

							<div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-600">
								<button
									type="button"
									disabled={listingPage === 1 || loadingListings}
									onClick={() =>
										setListingPage((prev) => Math.max(prev - 1, 1))
									}
									className="disabled:opacity-50"
								>
									Previous
								</button>
								<span>
									Page {listingPage} / {listingPages}
								</span>
								<button
									type="button"
									disabled={listingPage >= listingPages || loadingListings}
									onClick={() => setListingPage((prev) => prev + 1)}
									className="disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</section>
					)}

					{activeSection === "sponsored" && (
						<section className="space-y-6">
							<article className="rounded-3xl border border-gray-200 bg-white p-5">
								<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
									<h2 className="text-2xl font-display font-bold">
										Sponsored Ads
									</h2>
									<div className="flex flex-wrap items-center gap-2">
										<select
											value={sponsoredStatus}
											onChange={(event) =>
												setSponsoredStatus(event.target.value)
											}
											className="h-10 rounded-full border border-gray-200 bg-white px-3 text-sm"
										>
											<option value="all">All</option>
											<option value="pending">Pending</option>
											<option value="approved">Approved</option>
											<option value="rejected">Rejected</option>
										</select>
										<div className="flex items-center rounded-full border border-gray-200 bg-white px-3">
											<Search size={14} className="text-gray-400" />
											<input
												value={sponsoredSearch}
												onChange={(event) =>
													setSponsoredSearch(event.target.value)
												}
												placeholder="Search sponsored ads"
												className="h-10 w-52 bg-transparent px-2 text-sm outline-none"
											/>
										</div>
									</div>
								</div>

								<form
									onSubmit={saveSponsoredAd}
									className="mb-5 grid gap-3 rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4 lg:grid-cols-2"
								>
									<input
										value={sponsoredForm.title}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												title: event.target.value,
											}))
										}
										placeholder="Ad title"
										className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
									/>
									<input
										value={sponsoredForm.imageUrl}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												imageUrl: event.target.value,
											}))
										}
										placeholder="Image URL"
										className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
									/>
									<input
										value={sponsoredForm.targetUrl}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												targetUrl: event.target.value,
											}))
										}
										placeholder="Target URL"
										className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
									/>
									<select
										value={sponsoredForm.placement}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												placement: event.target.value,
											}))
										}
										className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
									>
										<option value="any">Any Sidebar</option>
										<option value="left">Left Sidebar</option>
										<option value="right">Right Sidebar</option>
									</select>
									<textarea
										value={sponsoredForm.description}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												description: event.target.value,
											}))
										}
										rows={2}
										placeholder="Description"
										className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
									/>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<select
												value={sponsoredForm.status}
												onChange={(event) =>
													setSponsoredForm((prev) => ({
														...prev,
														status: event.target.value,
													}))
												}
												className="h-10 rounded-lg border border-gray-200 px-2 text-sm"
											>
												<option value="approved">approved</option>
												<option value="pending">pending</option>
												<option value="rejected">rejected</option>
											</select>
											<label className="inline-flex items-center gap-2 text-sm text-gray-700">
												<input
													type="checkbox"
													checked={sponsoredForm.isActive}
													onChange={(event) =>
														setSponsoredForm((prev) => ({
															...prev,
															isActive: event.target.checked,
														}))
													}
												/>
												Active
											</label>
										</div>
										<input
											value={sponsoredForm.reviewNotes}
											onChange={(event) =>
												setSponsoredForm((prev) => ({
													...prev,
													reviewNotes: event.target.value,
												}))
											}
											placeholder="Review notes (optional)"
											className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
										/>
									</div>
									<div className="lg:col-span-2 flex gap-2">
										<button
											type="submit"
											disabled={
												actionKey === "sponsored-create" ||
												actionKey === `sponsored-update-${editingSponsoredId}`
											}
											className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
										>
											{editingSponsoredId
												? "Update Sponsored Ad"
												: "Create Sponsored Ad"}
										</button>
										{editingSponsoredId ? (
											<button
												type="button"
												onClick={resetSponsoredForm}
												className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
											>
												Cancel
											</button>
										) : null}
									</div>
								</form>

								<div className="overflow-x-auto">
									<table className="min-w-full text-left text-sm">
										<thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
											<tr>
												<th className="px-3 py-3">Ad</th>
												<th className="px-3 py-3">Submitter</th>
												<th className="px-3 py-3">Status</th>
												<th className="px-3 py-3">Placement</th>
												<th className="px-3 py-3 text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{loadingSponsored ? (
												<tr>
													<td className="px-3 py-6 text-gray-500" colSpan={5}>
														Loading sponsored ads...
													</td>
												</tr>
											) : sponsoredAds.length ? (
												sponsoredAds.map((entry) => (
													<tr
														key={entry.id}
														className="border-t border-gray-100"
													>
														<td className="px-3 py-3">
															<div className="flex items-center gap-3">
																<img
																	src={entry.imageUrl}
																	alt={entry.title}
																	className="h-12 w-12 rounded-xl object-cover"
																/>
																<div className="min-w-0">
																	<p className="line-clamp-1 font-semibold text-gray-900">
																		{entry.title}
																	</p>
																	<p className="line-clamp-1 text-xs text-gray-500">
																		{entry.targetUrl}
																	</p>
																</div>
															</div>
														</td>
														<td className="px-3 py-3 text-gray-600">
															{entry?.submittedBy?.name || "Admin"}
														</td>
														<td className="px-3 py-3">
															<span
																className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${entry.status === "approved" ? "bg-green-50 text-green-700" : entry.status === "rejected" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}`}
															>
																{entry.status}
															</span>
														</td>
														<td className="px-3 py-3 capitalize text-gray-600">
															{entry.placement || "any"}
														</td>
														<td className="px-3 py-3">
															<div className="flex justify-end gap-2">
																<button
																	type="button"
																	onClick={() => startSponsoredEdit(entry)}
																	className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-gray-700"
																>
																	<Pencil size={12} />
																</button>
																<button
																	type="button"
																	disabled={
																		actionKey === `sponsored-status-${entry.id}`
																	}
																	onClick={() =>
																		updateSponsoredStatus(
																			entry,
																			entry.status === "approved"
																				? "rejected"
																				: "approved",
																		)
																	}
																	className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 disabled:opacity-60"
																>
																	<Eye size={12} />
																</button>
																<button
																	type="button"
																	disabled={
																		actionKey === `sponsored-delete-${entry.id}`
																	}
																	onClick={() => removeSponsoredAd(entry.id)}
																	className="grid h-8 w-8 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 disabled:opacity-60"
																>
																	<Trash2 size={12} />
																</button>
															</div>
														</td>
													</tr>
												))
											) : (
												<tr>
													<td className="px-3 py-6 text-gray-500" colSpan={5}>
														No sponsored ads found.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
								<div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-600">
									<button
										type="button"
										disabled={sponsoredPage === 1 || loadingSponsored}
										onClick={() =>
											setSponsoredPage((prev) => Math.max(prev - 1, 1))
										}
										className="disabled:opacity-50"
									>
										Previous
									</button>
									<span>
										Page {sponsoredPage} / {sponsoredPages}
									</span>
									<button
										type="button"
										disabled={
											sponsoredPage >= sponsoredPages || loadingSponsored
										}
										onClick={() => setSponsoredPage((prev) => prev + 1)}
										className="disabled:opacity-50"
									>
										Next
									</button>
								</div>
							</article>

							<article className="rounded-3xl border border-gray-200 bg-white p-5">
								<h2 className="text-2xl font-display font-bold text-gray-900">
									Google Ads .js Snippet
								</h2>
								<p className="mt-2 text-sm text-gray-500">
									Paste and save your Google Ads snippet for future ad
									placements.
								</p>
								<form onSubmit={saveGoogleSnippet} className="mt-4 space-y-3">
									<textarea
										value={googleAdsSnippet}
										onChange={(event) =>
											setGoogleAdsSnippet(event.target.value)
										}
										rows={8}
										placeholder="<script async src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'></script>"
										className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono text-gray-700"
									/>
									<button
										type="submit"
										disabled={actionKey === "google-snippet-save"}
										className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
									>
										{actionKey === "google-snippet-save"
											? "Saving..."
											: "Save Snippet"}
									</button>
								</form>
							</article>
						</section>
					)}

					{activeSection === "categories" && (
						<section className="rounded-3xl border border-gray-200 bg-white p-5">
							<div className="mb-5 flex items-center justify-between gap-3">
								<h2 className="text-2xl font-display font-bold">Categories</h2>
								<span className="text-sm text-gray-500">
									Manage and create listing categories
								</span>
							</div>

							<div className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
								<input
									value={newCategoryName}
									onChange={(event) => setNewCategoryName(event.target.value)}
									placeholder="Category name"
									className="h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E9C54F]"
								/>
								<input
									value={newCategoryIcon}
									onChange={(event) => setNewCategoryIcon(event.target.value)}
									placeholder="Icon (optional)"
									className="h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E9C54F]"
								/>
								<input
									value={newCategoryColor}
									onChange={(event) => setNewCategoryColor(event.target.value)}
									placeholder="Color (optional)"
									className="h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E9C54F]"
								/>
								<button
									type="button"
									disabled={
										actionKey === "create-category" || loadingCategories
									}
									onClick={createCategory}
									className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#FFF5D1] px-4 text-sm font-semibold text-[#5C4D00] disabled:opacity-60"
								>
									{actionKey === "create-category" ? (
										<LoaderCircle size={14} className="animate-spin" />
									) : (
										<Plus size={14} />
									)}
									Create
								</button>
							</div>

							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="text-xs uppercase tracking-[0.12em] text-gray-500">
										<tr>
											<th className="px-3 py-3">Name</th>
											<th className="px-3 py-3">Slug</th>
											<th className="px-3 py-3">Icon</th>
											<th className="px-3 py-3">Color</th>
											<th className="px-3 py-3 text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{loadingCategories ? (
											<tr>
												<td className="px-3 py-6 text-gray-500" colSpan={5}>
													Loading categories...
												</td>
											</tr>
										) : categories.length ? (
											categories.map((category) => {
												const isEditing =
													Number(editingCategoryId) === Number(category.id);

												return (
													<tr
														key={category.id}
														className="border-t border-gray-100"
													>
														<td className="px-3 py-3">
															{isEditing ? (
																<input
																	value={editingCategoryName}
																	onChange={(event) =>
																		setEditingCategoryName(event.target.value)
																	}
																	className="h-9 w-full rounded-lg border border-gray-200 px-2"
																/>
															) : (
																<span className="font-medium text-gray-900">
																	{category.name}
																</span>
															)}
														</td>
														<td className="px-3 py-3 text-gray-600">
															{category.slug}
														</td>
														<td className="px-3 py-3">
															{isEditing ? (
																<input
																	value={editingCategoryIcon}
																	onChange={(event) =>
																		setEditingCategoryIcon(event.target.value)
																	}
																	placeholder="icon"
																	className="h-9 w-full rounded-lg border border-gray-200 px-2"
																/>
															) : (
																<span className="text-gray-600">
																	{category.icon || "-"}
																</span>
															)}
														</td>
														<td className="px-3 py-3">
															{isEditing ? (
																<input
																	value={editingCategoryColor}
																	onChange={(event) =>
																		setEditingCategoryColor(event.target.value)
																	}
																	placeholder="#hex or token"
																	className="h-9 w-full rounded-lg border border-gray-200 px-2"
																/>
															) : (
																<span className="text-gray-600">
																	{category.color || "-"}
																</span>
															)}
														</td>
														<td className="px-3 py-3">
															<div className="flex justify-end gap-2">
																{isEditing ? (
																	<>
																		<button
																			type="button"
																			disabled={
																				actionKey ===
																				`update-category-${category.id}`
																			}
																			onClick={saveCategoryEdit}
																			className="inline-flex h-9 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-700 disabled:opacity-60"
																		>
																			<CheckCircle2 size={13} /> Save
																		</button>
																		<button
																			type="button"
																			onClick={() => setEditingCategoryId(null)}
																			className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-gray-600"
																		>
																			<X size={13} />
																		</button>
																	</>
																) : (
																	<>
																		<button
																			type="button"
																			onClick={() =>
																				startCategoryEdit(category)
																			}
																			className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-gray-700"
																		>
																			<Pencil size={13} />
																		</button>
																		<button
																			type="button"
																			disabled={
																				actionKey ===
																				`delete-category-${category.id}`
																			}
																			onClick={() =>
																				deleteCategory(category.id)
																			}
																			className="grid h-9 w-9 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 disabled:opacity-60"
																		>
																			<Trash2 size={13} />
																		</button>
																	</>
																)}
															</div>
														</td>
													</tr>
												);
											})
										) : (
											<tr>
												<td className="px-3 py-6 text-gray-500" colSpan={5}>
													No categories found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</section>
					)}

					{activeSection === "settings" && (
						<section className="grid gap-6 lg:grid-cols-1">
							<article className="rounded-3xl border border-gray-200 bg-white p-6">
								<h2 className="text-2xl font-display font-bold text-gray-900">
									Profile Settings
								</h2>
								<p className="mt-2 text-sm text-gray-500">
									This mirrors profile page content directly in admin settings.
								</p>
								<form onSubmit={saveAdminProfile} className="mt-5 space-y-3">
									<input
										value={adminProfileForm.name}
										onChange={(event) =>
											setAdminProfileForm((prev) => ({
												...prev,
												name: event.target.value,
											}))
										}
										placeholder="Name"
										className="h-11 w-full rounded-xl border border-gray-200 px-3"
									/>
									<input
										value={adminProfileForm.phone}
										onChange={(event) =>
											setAdminProfileForm((prev) => ({
												...prev,
												phone: event.target.value,
											}))
										}
										placeholder="Phone"
										className="h-11 w-full rounded-xl border border-gray-200 px-3"
									/>
									<input
										value={adminProfileForm.location}
										onChange={(event) =>
											setAdminProfileForm((prev) => ({
												...prev,
												location: event.target.value,
											}))
										}
										placeholder="Location"
										className="h-11 w-full rounded-xl border border-gray-200 px-3"
									/>
									<button
										type="submit"
										disabled={actionKey === "save-admin-profile"}
										className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
									>
										{actionKey === "save-admin-profile"
											? "Saving..."
											: "Save Profile"}
									</button>
								</form>
								<div className="mt-5 rounded-2xl border border-[#FFE49A] bg-[#FFF9E5] p-4 text-sm text-[#5C4D00]">
									All sponsored ad CRUD operations are now managed in the
									<span className="font-semibold">Sponsored</span> section,
									including approvals and Google Ads snippet settings.
								</div>
							</article>
						</section>
					)}
				</main>
			</div>
		</div>
	);
}
