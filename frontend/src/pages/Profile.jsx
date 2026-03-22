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
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Profile() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("overview");

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

	return (
		<div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
			<Navbar />

			<main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
				{/* Top Profile Banner */}
				<div className="bg-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-gray-100 shadow-sm relative overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-[#FFD600]/20 to-transparent pointer-events-none" />

					{/* Avatar */}
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

					{/* Info */}
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
								India
							</span>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-3 z-10 w-full md:w-auto">
						<button className="flex-1 justify-center inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800">
							<Edit2 size={16} /> Edit Profile
						</button>
					</div>
				</div>

				{/* Dashboard Content */}
				<div className="mt-8 grid lg:grid-cols-4 gap-8">
					{/* Sidebar Navigation */}
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
									<span className="bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
										3
									</span>
								</Link>

								<hr className="my-2 border-gray-100" />
								<p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 pb-2 pt-2">
									Settings
								</p>

								<button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all">
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

					{/* Main Panel Content */}
					<div className="lg:col-span-3 space-y-6">
						<div className="grid sm:grid-cols-2 gap-4">
							<div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
								<div>
									<p className="text-gray-500 font-bold mb-1">
										Active Listings
									</p>
									<h3 className="text-4xl font-display font-black text-black">
										12
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
										8
									</h3>
								</div>
								<div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center text-green-600">
									<Star size={24} className="fill-green-600" />
								</div>
							</div>
						</div>

						<div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
							<h3 className="text-xl font-bold font-display mb-6">
								Personal Information
							</h3>

							<div className="space-y-4">
								<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
									<div className="text-sm font-bold text-gray-400">
										Full Name
									</div>
									<div className="sm:col-span-2 font-medium">{user?.name}</div>
								</div>
								<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
									<div className="text-sm font-bold text-gray-400">
										Email Address
									</div>
									<div className="sm:col-span-2 font-medium">{user?.email}</div>
								</div>
								<div className="grid sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
									<div className="text-sm font-bold text-gray-400">
										Phone Number
									</div>
									<div className="sm:col-span-2 font-medium text-gray-400 italic">
										Not added yet
									</div>
								</div>
								<div className="grid sm:grid-cols-3 gap-4">
									<div className="text-sm font-bold text-gray-400">
										Account Type
									</div>
									<div className="sm:col-span-2">
										<span className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
											{user?.role || "Member"}
										</span>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
							<div className="flex items-center justify-between mb-6">
								<h3 className="text-xl font-bold font-display">
									Recent Activity
								</h3>
								<Link
									to="/my-ads"
									className="text-sm font-bold text-[#b29500] hover:text-black"
								>
									View all →
								</Link>
							</div>

							<div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
								<Package
									size={40}
									strokeWidth={1}
									className="mb-3 text-gray-300"
								/>
								<p className="font-medium">No recent activity detected.</p>
								<Link
									to="/post-ad"
									className="mt-4 text-sm font-bold text-black border-b border-black pb-0.5"
								>
									Post an Ad now
								</Link>
							</div>
						</div>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}
