import {
	Camera,
	Edit2,
	LogOut,
	Package,
	Star,
	ShieldCheck,
	Mail,
	MapPin,
	KeyRound,
	CalendarDays,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";

export default function Profile() {
	const { user, logout, setCurrentUser } = useAuth();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("overview");
	const [listings, setListings] = useState([]);
	const [messageCount, setMessageCount] = useState(0);
	const [savingProfile, setSavingProfile] = useState(false);
	const [changingPassword, setChangingPassword] = useState(false);
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

	useEffect(() => {
		setProfileForm({
			name: user?.name || "",
			phone: user?.phone || "",
			location: user?.location || "",
			businessName: user?.businessName || "",
			gstOrMsme: user?.gstOrMsme || "",
		});
	}, [user]);

	const isBusinessAccount =
		String(user?.accountType || "").toLowerCase() === "business";

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const [listingRes, convoRes] = await Promise.all([
					api.get("/listings", { params: { userId: "me", limit: 100 } }),
					api
						.get("/conversations")
						.catch(() => ({ data: { conversations: [] } })),
				]);

				setListings(
					Array.isArray(listingRes?.data?.listings)
						? listingRes.data.listings
						: [],
				);
				setMessageCount(
					Array.isArray(convoRes?.data?.conversations)
						? convoRes.data.conversations.length
						: 0,
				);
			} catch {
				toast.error("Unable to load profile stats");
			}
		};

		fetchStats();
	}, []);

	const handleLogout = () => {
		logout();
		navigate("/login");
		toast.success("Logged out successfully");
	};

	const joinDate = user?.createdAt
		? new Date(user.createdAt).toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			})
		: "Recently";

	const activeListings = useMemo(
		() =>
			listings.filter((item) => String(item?.status || "active") === "active")
				.length,
		[listings],
	);

	const soldListings = useMemo(
		() =>
			listings.filter((item) => String(item?.status || "") === "sold").length,
		[listings],
	);

	const onUpdateProfile = async (event) => {
		event.preventDefault();
		if (!profileForm.name.trim()) {
			toast.error("Name is required");
			return;
		}

		try {
			setSavingProfile(true);
			const payload = {
				name: profileForm.name,
				phone: profileForm.phone,
				location: profileForm.location,
			};

			if (isBusinessAccount) {
				payload.businessName = profileForm.businessName;
				payload.gstOrMsme = profileForm.gstOrMsme;
			}

			const { data } = await api.put("/users/me", payload);
			setCurrentUser(data?.user || user);
			toast.success("Profile updated");
			setActiveTab("overview");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update profile");
		} finally {
			setSavingProfile(false);
		}
	};

	const onChangePassword = async (event) => {
		event.preventDefault();
		if (!passwordForm.currentPassword || !passwordForm.newPassword) {
			toast.error("Both password fields are required");
			return;
		}

		try {
			setChangingPassword(true);
			await api.put("/users/me/password", passwordForm);
			setPasswordForm({ currentPassword: "", newPassword: "" });
			toast.success("Password updated");
			setActiveTab("overview");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to change password",
			);
		} finally {
			setChangingPassword(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
			<Navbar />

			<main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
				<div className="bg-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-gray-100 shadow-sm relative overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-[#FFD600]/20 to-transparent pointer-events-none" />

					<div className="relative group shrink-0 mt-4 md:mt-0">
						<div className="h-32 w-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100">
							<img
								src={
									user?.avatar ||
									`https://ui-avatars.com/api/?name=${user?.name || "User"}&background=random`
								}
								alt={user?.name}
								className="h-full w-full object-cover"
							/>
						</div>
						<button className="absolute bottom-0 right-0 h-10 w-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:border-black transition-all shadow-md">
							<Camera size={18} />
						</button>
					</div>

					<div className="flex-1 text-center md:text-left z-10 pt-2">
						<h1 className="text-3xl font-display font-black text-black flex items-center justify-center md:justify-start gap-3">
							{user?.name || "DealPost User"}
							{(user?.role === "admin" || user?.role === "developer") && (
								<ShieldCheck size={24} className="text-blue-500" />
							)}
						</h1>
						<p className="text-gray-500 font-medium mt-1">{user?.email}</p>

						<div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm font-semibold text-gray-600">
							<span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
								<CalendarDays size={16} className="text-gray-400" />
								Joined {joinDate}
							</span>
							<span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
								<MapPin size={16} className="text-gray-400" />
								{user?.location || "Location not set"}
							</span>
						</div>
					</div>

					<div className="flex gap-3 z-10 w-full md:w-auto">
						<button
							type="button"
							onClick={() => setActiveTab("edit-profile")}
							className="flex-1 justify-center inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
						>
							<Edit2 size={16} /> Edit Profile
						</button>
					</div>
				</div>

				<div className="mt-8 grid lg:grid-cols-4 gap-8">
					<div className="lg:col-span-1">
						<div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm sticky top-24">
							<div className="p-4 flex flex-col gap-1.5">
								<p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 pb-2 pt-2">
									Dashboard
								</p>

								<button
									onClick={() => setActiveTab("overview")}
									className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
										activeTab === "overview"
											? "bg-[#FFD600] text-black"
											: "text-gray-600 hover:bg-gray-50 hover:text-black"
									}`}
								>
									<Package size={18} /> Account Overview
								</button>

								<Link
									to="/my-ads"
									className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all"
								>
									<Star size={18} /> Manage My Ads
								</Link>

								<Link
									to="/messages"
									className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all"
								>
									<div className="flex items-center gap-3">
										<Mail size={18} /> Messages
									</div>
									<span className="bg-black text-white text-[10px] min-w-5 h-5 px-1 flex items-center justify-center rounded-full">
										{messageCount}
									</span>
								</Link>

								<hr className="my-2 border-gray-100" />
								<p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 pb-2 pt-2">
									Settings
								</p>

								<button
									onClick={() => setActiveTab("security")}
									className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all"
								>
									<KeyRound size={18} /> Security & Passwords
								</button>

								<button
									onClick={handleLogout}
									className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-2"
								>
									<LogOut size={18} /> Sign Out
								</button>
							</div>
						</div>
					</div>

					<div className="lg:col-span-3 space-y-6">
						<div className="grid sm:grid-cols-2 gap-4">
							<div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
								<div>
									<p className="text-gray-500 font-bold mb-1">
										Active Listings
									</p>
									<h3 className="text-4xl font-display font-black text-black">
										{activeListings}
									</h3>
								</div>
								<div className="h-14 w-14 rounded-full bg-[#FFD600]/20 flex items-center justify-center text-[#B29500]">
									<Package size={24} />
								</div>
							</div>

							<div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
								<div>
									<p className="text-gray-500 font-bold mb-1">Ads Sold</p>
									<h3 className="text-4xl font-display font-black text-black">
										{soldListings}
									</h3>
								</div>
								<div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center text-green-600">
									<Star size={24} className="fill-green-600" />
								</div>
							</div>
						</div>

						{activeTab === "edit-profile" ? (
							<form
								onSubmit={onUpdateProfile}
								className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-4"
							>
								<h3 className="text-xl font-bold font-display">Edit Profile</h3>
								<input
									value={profileForm.name}
									onChange={(event) =>
										setProfileForm((prev) => ({
											...prev,
											name: event.target.value,
										}))
									}
									placeholder="Full name"
									className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
								/>
								<input
									value={profileForm.phone}
									onChange={(event) =>
										setProfileForm((prev) => ({
											...prev,
											phone: event.target.value,
										}))
									}
									placeholder="Phone number"
									className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
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
									className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
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
											className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
										/>
										<input
											value={profileForm.gstOrMsme}
											onChange={(event) =>
												setProfileForm((prev) => ({
													...prev,
													gstOrMsme: event.target.value,
												}))
											}
											placeholder="GST / MSME Number"
											className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
										/>
									</>
								) : null}
								<div className="flex gap-3">
									<button
										type="submit"
										disabled={savingProfile}
										className="rounded-xl bg-black px-5 h-11 text-white font-semibold"
									>
										{savingProfile ? "Saving..." : "Save Profile"}
									</button>
									<button
										type="button"
										onClick={() => setActiveTab("overview")}
										className="rounded-xl bg-[#F5F5F5] px-5 h-11 font-semibold"
									>
										Cancel
									</button>
								</div>
							</form>
						) : activeTab === "security" ? (
							<form
								onSubmit={onChangePassword}
								className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-4"
							>
								<h3 className="text-xl font-bold font-display">
									Change Password
								</h3>
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
									className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
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
									className="w-full rounded-xl bg-[#F5F5F5] px-4 h-12"
								/>
								<div className="flex gap-3">
									<button
										type="submit"
										disabled={changingPassword}
										className="rounded-xl bg-black px-5 h-11 text-white font-semibold"
									>
										{changingPassword ? "Updating..." : "Update Password"}
									</button>
									<button
										type="button"
										onClick={() => setActiveTab("overview")}
										className="rounded-xl bg-[#F5F5F5] px-5 h-11 font-semibold"
									>
										Cancel
									</button>
								</div>
							</form>
						) : (
							<>
								<div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
									<h3 className="text-xl font-bold font-display mb-6">
										Personal Information
									</h3>

									<div className="space-y-4">
										<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
											<div className="text-sm font-bold text-gray-400">
												Full Name
											</div>
											<div className="sm:col-span-2 font-medium">
												{user?.name}
											</div>
										</div>
										<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
											<div className="text-sm font-bold text-gray-400">
												Email Address
											</div>
											<div className="sm:col-span-2 font-medium">
												{user?.email}
											</div>
										</div>
										<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
											<div className="text-sm font-bold text-gray-400">
												Phone Number
											</div>
											<div className="sm:col-span-2 font-medium">
												{user?.phone || "Not added yet"}
											</div>
										</div>
										<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
											<div className="text-sm font-bold text-gray-400">
												Location
											</div>
											<div className="sm:col-span-2 font-medium">
												{user?.location || "Not set"}
											</div>
										</div>
										<div className="grid sm:grid-cols-3 gap-4">
											<div className="text-sm font-bold text-gray-400">
												Account Type
											</div>
											<div className="sm:col-span-2">
												<span className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
													{user?.accountType || "personal"}
												</span>
											</div>
										</div>
										{isBusinessAccount ? (
											<>
												<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
													<div className="text-sm font-bold text-gray-400">
														Business Name
													</div>
													<div className="sm:col-span-2 font-medium">
														{user?.businessName || "Not set"}
													</div>
												</div>
												<div className="grid sm:grid-cols-3 gap-4">
													<div className="text-sm font-bold text-gray-400">
														GST / MSME
													</div>
													<div className="sm:col-span-2 font-medium">
														{user?.gstOrMsme || "Not set"}
													</div>
												</div>
											</>
										) : null}
										<div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
											<div className="text-sm font-bold text-gray-400">
												Role
											</div>
											<div className="sm:col-span-2">
												<span className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
													{user?.role || "member"}
												</span>
											</div>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
									<div className="flex items-center justify-between mb-6">
										<h3 className="text-xl font-bold font-display">
											Recent Listings
										</h3>
										<Link
											to="/my-ads"
											className="text-sm font-bold text-[#b29500] hover:text-black"
										>
											View all →
										</Link>
									</div>

									{listings.length ? (
										<div className="space-y-3">
											{listings.slice(0, 5).map((listing) => (
												<div
													key={listing?._id || listing?.id}
													className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
												>
													<div>
														<p className="font-semibold text-black">
															{listing?.title}
														</p>
														<p className="text-xs text-gray-500 uppercase">
															{listing?.status || "active"}
														</p>
													</div>
													<p className="font-mono font-semibold">
														${listing?.price || 0}
													</p>
												</div>
											))}
										</div>
									) : (
										<div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
											<Package
												size={40}
												strokeWidth={1}
												className="mb-3 text-gray-300"
											/>
											<p className="font-medium">No listings yet.</p>
											<Link
												to="/post-ad"
												className="mt-4 text-sm font-bold text-black border-b border-black pb-0.5"
											>
												Post an Ad now
											</Link>
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}
