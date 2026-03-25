import {
	AlertTriangle,
	BadgeCheck,
	KeyRound,
	LayoutDashboard,
	Mail,
	Megaphone,
	PlusCircle,
	ShieldOff,
	ShoppingBag,
	Star,
	Trash2,
	UserRoundCog,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";

export default function UserDashboard() {
	const { user, setCurrentUser, logout } = useAuth();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("overview");
	const [saving, setSaving] = useState(false);
	const [busyAction, setBusyAction] = useState("");
	const [profileForm, setProfileForm] = useState({
		name: user?.name || "",
		phone: user?.phone || "",
		location: user?.location || "",
		businessName: user?.businessName || "",
		gstOrMsme: user?.gstOrMsme || "",
	});
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
	});
	const [dashboardLoading, setDashboardLoading] = useState(true);
	const [myListings, setMyListings] = useState([]);
	const [likedListings, setLikedListings] = useState([]);
	const [messageCount, setMessageCount] = useState(0);

	useEffect(() => {
		setProfileForm({
			name: user?.name || "",
			phone: user?.phone || "",
			location: user?.location || "",
			businessName: user?.businessName || "",
			gstOrMsme: user?.gstOrMsme || "",
		});
	}, [user]);

	useEffect(() => {
		let active = true;

		const fetchDashboardData = async () => {
			try {
				setDashboardLoading(true);
				const [listingRes, convoRes, likedRes] = await Promise.all([
					api.get("/listings", { params: { userId: "me", limit: 40 } }),
					api
						.get("/conversations")
						.catch(() => ({ data: { conversations: [] } })),
					api
						.get("/listings/liked/my")
						.catch(() => ({ data: { listings: [] } })),
				]);

				if (!active) return;

				const ownListings = Array.isArray(listingRes?.data?.listings)
					? listingRes.data.listings
					: [];
				const conversations = Array.isArray(convoRes?.data?.conversations)
					? convoRes.data.conversations
					: [];
				const liked = Array.isArray(likedRes?.data?.listings)
					? likedRes.data.listings
					: [];

				setMyListings(ownListings);
				setMessageCount(conversations.length);
				setLikedListings(liked);
			} catch {
				if (!active) return;
				toast.error("Unable to load dashboard data");
			} finally {
				if (active) {
					setDashboardLoading(false);
				}
			}
		};

		fetchDashboardData();

		return () => {
			active = false;
		};
	}, []);

	const isBusinessAccount =
		String(user?.accountType || "").toLowerCase() === "business";

	const listingStats = useMemo(() => {
		const initial = {
			total: myListings.length,
			active: 0,
			sold: 0,
			pending: 0,
		};

		for (const listing of myListings) {
			const status = String(listing?.status || "active").toLowerCase();
			if (status === "sold") initial.sold += 1;
			else if (status === "pending") initial.pending += 1;
			else initial.active += 1;
		}

		return initial;
	}, [myListings]);

	const recentListings = useMemo(() => myListings.slice(0, 4), [myListings]);

	const updateProfile = async (event) => {
		event.preventDefault();
		if (!profileForm.name.trim()) {
			toast.error("Name is required");
			return;
		}

		try {
			setSaving(true);
			const payload = {
				name: profileForm.name,
				phone: profileForm.phone,
				location: profileForm.location,
				businessName: isBusinessAccount ? profileForm.businessName : undefined,
				gstOrMsme: isBusinessAccount ? profileForm.gstOrMsme : undefined,
			};
			const { data } = await api.put("/users/me", payload);
			setCurrentUser(data?.user || user);
			toast.success("Profile updated");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update profile");
		} finally {
			setSaving(false);
		}
	};

	const updatePassword = async (event) => {
		event.preventDefault();
		if (!passwordForm.currentPassword || !passwordForm.newPassword) {
			toast.error("Both password fields are required");
			return;
		}

		try {
			setBusyAction("password");
			await api.put("/users/me/password", passwordForm);
			setPasswordForm({ currentPassword: "", newPassword: "" });
			toast.success("Password updated");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to update password",
			);
		} finally {
			setBusyAction("");
		}
	};

	const deactivateAccount = async () => {
		if (
			!window.confirm(
				"Deactivate account? You can contact support to reactivate.",
			)
		) {
			return;
		}

		try {
			setBusyAction("deactivate");
			await api.patch("/users/me/deactivate");
			logout();
			toast.success("Your account has been deactivated");
			navigate("/login");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to deactivate account",
			);
		} finally {
			setBusyAction("");
		}
	};

	const removeAccount = async () => {
		if (!window.confirm("Remove account permanently? This cannot be undone.")) {
			return;
		}

		try {
			setBusyAction("remove");
			await api.delete("/users/me");
			logout();
			toast.success("Account removed successfully");
			navigate("/signup");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to remove account");
		} finally {
			setBusyAction("");
		}
	};

	return (
		<div className="min-h-screen bg-[#F7F8FA] flex flex-col">
			<Navbar />
			<main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
					<aside className="rounded-3xl border border-gray-200 bg-white p-4 lg:sticky lg:top-24 lg:h-fit">
						<p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
							Dashboard
						</p>
						<div className="space-y-1.5">
							<button
								type="button"
								onClick={() => setActiveTab("overview")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "overview"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<LayoutDashboard size={16} /> Overview
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("profile")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "profile"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<UserRoundCog size={16} /> Edit Profile
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("security")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "security"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<KeyRound size={16} /> Security
							</button>
							<Link
								to="/messages"
								className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
							>
								<Mail size={16} /> Messages
							</Link>
						</div>

						<p className="px-3 pb-3 pt-5 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
							Settings
						</p>
						<div className="space-y-2">
							<button
								type="button"
								onClick={deactivateAccount}
								disabled={busyAction === "deactivate"}
								className="flex w-full items-center gap-2 rounded-xl bg-[#FFF1F1] px-3 py-2.5 text-sm font-semibold text-[#A33B3B] disabled:opacity-60"
							>
								<ShieldOff size={16} />
								{busyAction === "deactivate"
									? "Deactivating..."
									: "Deactivate Account"}
							</button>
							<button
								type="button"
								onClick={removeAccount}
								disabled={busyAction === "remove"}
								className="flex w-full items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								<Trash2 size={16} />
								{busyAction === "remove" ? "Removing..." : "Remove Account"}
							</button>
						</div>
					</aside>

					<section className="space-y-6">
						{activeTab === "overview" ? (
							<>
								<div className="rounded-3xl border border-gray-200 bg-white p-6">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<h1 className="text-3xl font-display font-bold text-black">
												User Dashboard
											</h1>
											<p className="mt-2 text-sm text-gray-500">
												Manage your profile, listings, and conversations in one
												place.
											</p>
										</div>
										<div className="flex gap-2">
											<Link
												to="/post-ad"
												className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
											>
												<PlusCircle size={16} /> New Ad
											</Link>
											<Link
												to="/my-ads"
												className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
											>
												<Megaphone size={16} /> Manage Ads
											</Link>
										</div>
									</div>
									<div className="mt-5 rounded-2xl border border-[#FFE49A] bg-[#FFF9E5] p-4 text-sm text-[#5C4D00]">
										<div className="flex items-start gap-2">
											<AlertTriangle size={16} className="mt-0.5" />
											<p>
												Keep your profile and location updated for better buyer
												discovery.
											</p>
										</div>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Total Listings
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : listingStats.total}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Active Ads
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : listingStats.active}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Saved Products
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : likedListings.length}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Conversations
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : messageCount}
										</p>
									</div>
								</div>

								<div className="rounded-3xl border border-gray-200 bg-white p-6">
									<div className="mb-4 flex items-center justify-between">
										<h2 className="text-xl font-display font-bold text-black">
											Recent Listings
										</h2>
										<Link
											to="/my-ads"
											className="text-sm font-semibold text-[#8B7322]"
										>
											View all
										</Link>
									</div>

									{dashboardLoading ? (
										<p className="text-sm text-gray-500">Loading listings...</p>
									) : recentListings.length ? (
										<div className="grid gap-3 md:grid-cols-2">
											{recentListings.map((listing) => {
												const listingId =
													listing?.productId || listing?._id || listing?.id;
												const status = String(
													listing?.status || "active",
												).toLowerCase();
												return (
													<div
														key={listingId}
														className="rounded-2xl border border-gray-200 p-3"
													>
														<div className="flex items-start justify-between gap-3">
															<div className="min-w-0">
																<p className="line-clamp-1 text-sm font-semibold text-gray-900">
																	{listing?.title || "Untitled listing"}
																</p>
																<p className="mt-1 text-xs text-gray-500">
																	${Number(listing?.price || 0)}
																</p>
															</div>
															<span
																className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
																	status === "sold"
																		? "bg-green-50 text-green-700"
																		: status === "pending"
																			? "bg-orange-50 text-orange-700"
																			: "bg-[#FFF9E5] text-[#8B7322]"
																}`}
															>
																{status}
															</span>
														</div>
														<div className="mt-3 flex gap-2">
															<Link
																to={`/listing/${listingId}`}
																className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700"
															>
																<ShoppingBag size={12} /> View
															</Link>
															<Link
																to="/my-ads"
																className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700"
															>
																<BadgeCheck size={12} /> Manage
															</Link>
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
											<p className="text-sm font-semibold text-gray-700">
												You have no listings yet.
											</p>
											<p className="mt-1 text-xs text-gray-500">
												Create your first ad to make your dashboard come alive.
											</p>
											<Link
												to="/post-ad"
												className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
											>
												<PlusCircle size={14} /> Start Listing
											</Link>
										</div>
									)}
								</div>
							</>
						) : null}

						{activeTab === "profile" ? (
							<form
								onSubmit={updateProfile}
								className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6"
							>
								<h2 className="text-2xl font-display font-bold text-black">
									Edit Profile
								</h2>
								<input
									value={profileForm.name}
									onChange={(event) =>
										setProfileForm((prev) => ({
											...prev,
											name: event.target.value,
										}))
									}
									placeholder="Full name"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								<input
									value={profileForm.phone}
									onChange={(event) =>
										setProfileForm((prev) => ({
											...prev,
											phone: event.target.value,
										}))
									}
									placeholder="Phone"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								<input
									value={profileForm.location}
									onChange={(event) =>
										setProfileForm((prev) => ({
											...prev,
											location: event.target.value,
										}))
									}
									placeholder="Location"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								{isBusinessAccount ? (
									<>
										<input
											value={profileForm.businessName}
											onChange={(event) =>
												setProfileForm((prev) => ({
													...prev,
													businessName: event.target.value,
												}))
											}
											placeholder="Business name"
											className="h-11 w-full rounded-xl border border-gray-200 px-3"
										/>
										<input
											value={profileForm.gstOrMsme}
											onChange={(event) =>
												setProfileForm((prev) => ({
													...prev,
													gstOrMsme: event.target.value,
												}))
											}
											placeholder="GST / MSME number"
											className="h-11 w-full rounded-xl border border-gray-200 px-3"
										/>
									</>
								) : null}
								<button
									type="submit"
									disabled={saving}
									className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
								>
									{saving ? "Saving..." : "Save Profile"}
								</button>
							</form>
						) : null}

						{activeTab === "security" ? (
							<form
								onSubmit={updatePassword}
								className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6"
							>
								<h2 className="text-2xl font-display font-bold text-black">
									Security
								</h2>
								<input
									type="password"
									value={passwordForm.currentPassword}
									onChange={(event) =>
										setPasswordForm((prev) => ({
											...prev,
											currentPassword: event.target.value,
										}))
									}
									placeholder="Current password"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								<input
									type="password"
									value={passwordForm.newPassword}
									onChange={(event) =>
										setPasswordForm((prev) => ({
											...prev,
											newPassword: event.target.value,
										}))
									}
									placeholder="New password"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								<button
									type="submit"
									disabled={busyAction === "password"}
									className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
								>
									{busyAction === "password"
										? "Updating..."
										: "Change Password"}
								</button>
							</form>
						) : null}
					</section>
				</div>
			</main>
			<Footer />
		</div>
	);
}
