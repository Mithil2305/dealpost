import { Bell, ChevronDown, MapPin, MessageSquare, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function BrandLogo() {
	return (
		<Link to="/" className="flex items-center gap-2 text-xl">
			<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD600]">
				<MapPin size={16} className="text-black" fill="black" />
			</div>
			<div className="text-black">
				<span className="font-bold">Deal.</span>
				<span>Post</span>
			</div>
		</Link>
	);
}

export default function Navbar({ search = "", onSearchChange }) {
	const { user } = useAuth();
	const navigate = useNavigate();

	return (
		<header className="sticky top-0 z-40 bg-white border-b border-gray-100">
			<div className="flex h-16 w-full items-center px-6">
				{/* Left Section: Logo & Location */}
				<div className="flex items-center gap-8">
					<BrandLogo />

					<div className="hidden cursor-pointer items-center gap-1.5 text-sm lg:flex">
						<MapPin size={16} className="text-[#8B7322]" fill="#8B7322" />
						<span className="font-bold text-black">Chennai, India</span>
						<ChevronDown size={16} className="text-gray-400" />
					</div>
				</div>

				{/* Center Section: Search Bar */}
				<div className="mx-8 hidden flex-1 items-center justify-center lg:flex">
					<div className="flex w-full max-w-2xl items-center rounded-full bg-[#F1F1F1] px-4 py-2.5">
						<Search size={18} className="text-gray-500" />
						<input
							value={search}
							onChange={(event) => onSearchChange?.(event.target.value)}
							placeholder="Find Cars, Mobile Phones, and more..."
							className="ml-3 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
						/>
					</div>
				</div>

				{/* Right Section: Actions & Profile */}
				<div className="ml-auto flex items-center gap-6">
					<button
						type="button"
						onClick={() => navigate("/messages")}
						className="text-black transition hover:opacity-70"
						aria-label="Messages"
					>
						<MessageSquare size={22} fill="black" />
					</button>

					<button
						type="button"
						className="text-black transition hover:opacity-70"
						aria-label="Notifications"
					>
						<Bell size={22} fill="black" />
					</button>

					<button
						type="button"
						onClick={() => navigate("/business-listings")}
						className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-[#FFD600] hover:text-black lg:inline-flex"
					>
						Businesses
					</button>

					<button
						type="button"
						onClick={() => navigate("/post-ad")}
						className="hidden rounded-full bg-[#FFF5D1] px-5 py-2 text-sm font-bold text-[#5C4D00] transition hover:bg-[#FFEAA3] sm:inline-flex"
					>
						START LISTING
					</button>

					<Link
						to="/profile"
						className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center transition-all hover:border-[#FFD600] group"
						aria-label="Open profile"
					>
						<img
							src={user?.avatar || "https://placehold.co/80x80?text=U"}
							alt={user?.name || "User avatar"}
							className="h-full w-full object-cover group-hover:opacity-90"
						/>
					</Link>
				</div>
			</div>
		</header>
	);
}
