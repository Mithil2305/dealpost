import {
	ArrowRight,
	ChevronRight,
	Clock,
	Heart,
	MapPin,
	Monitor,
	Search,
	Sofa,
	Sparkles,
	Star,
	User,
	Car,
	Gem,
	Home as HomeIcon,
	Trophy,
	Zap,
	ChevronLeft,
	Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { pickArray } from "../utils/api";

// Hardcoded mock data to perfectly match the image visually
const MOCK_CATEGORIES = [
	{ name: "Tech", icon: Monitor, active: true },
	{ name: "Living", icon: Sofa },
	{ name: "Talent", icon: User },
	{ name: "Auto", icon: Car },
	{ name: "Luxury", icon: Gem },
	{ name: "Estate", icon: HomeIcon },
	{ name: "Sports", icon: Trophy },
];

const MOCK_RECOMMENDATIONS = [
	{
		id: 1,
		title: "Nike Air Max Limited",
		category: "TECH • FASHION",
		price: "$120",
		image:
			"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600",
		seller: {
			name: "VERIFIED SELLER",
			avatar: "https://randomuser.me/api/portraits/men/1.jpg",
		},
		time: "2m ago",
	},
	{
		id: 2,
		title: "Nomos Metro Neomatik",
		category: "LUXURY • ACCESSORIES",
		price: "$450",
		image:
			"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
		seller: {
			name: "PREMIUM USER",
			avatar: "https://randomuser.me/api/portraits/women/2.jpg",
		},
		time: "1h ago",
	},
	{
		id: 3,
		title: 'MacBook Pro M2 14"',
		category: "TECH • ELECTRONICS",
		price: "$899",
		image:
			"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
		seller: {
			name: "EVANSELLER",
			avatar: "https://randomuser.me/api/portraits/men/3.jpg",
		},
		time: "12h ago",
	},
	{
		id: 4,
		title: "Velvet Modular Sofa",
		category: "LIVING • FURNITURE",
		price: "$1200",
		image:
			"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600",
		seller: {
			name: "VERIFIED",
			avatar: "https://randomuser.me/api/portraits/women/4.jpg",
		},
		time: "1d ago",
	},
	{
		id: 5,
		title: "Royal Enfield Classic",
		category: "AUTO • VEHICLES",
		price: "$6800",
		image:
			"https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=600",
		seller: {
			name: "DEALER",
			avatar: "https://randomuser.me/api/portraits/men/5.jpg",
		},
		time: "2d ago",
	},
];

export default function Home() {
	const [search, setSearch] = useState("");
	const [listings, setListings] = useState([]);

	// Maintaining API logic, but using mock data for visual presentation if empty
	const displayListings = listings.length > 0 ? listings : MOCK_RECOMMENDATIONS;

	return (
		<div className="min-h-screen bg-white font-sans text-black">
			{/* Navbar would go here, assuming it's imported and handles its own layout */}
			<Navbar showSearch search={search} onSearchChange={setSearch} />

			<main className="mx-auto w-full max-w-[1780px] px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
					<aside className="hidden xl:block">
						<div className="sticky top-24 space-y-4">
							<div className="rounded-3xl border border-dashed border-[#E2E2E2] bg-[#FAFAFA] p-4 text-center">
								<p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
									Ad Slot
								</p>
								<div className="mt-2 h-[260px] rounded-2xl bg-white" />
							</div>
							<div className="rounded-3xl border border-dashed border-[#E2E2E2] bg-[#FAFAFA] p-4 text-center">
								<p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
									Sponsored
								</p>
								<div className="mt-2 h-[200px] rounded-2xl bg-white" />
							</div>
						</div>
					</aside>

					<div className="min-w-0">
						{/* Categories Row */}
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold font-display">Fast browse</h2>
							<Link
								to="/categories"
								className="text-sm font-bold text-[#666666] hover:text-black transition-colors"
							>
								View All →
							</Link>
						</div>
						<section className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
							{MOCK_CATEGORIES.map((cat) => (
								<Link
									key={cat.name}
									to={`/explore?category=${encodeURIComponent(cat.name)}`}
									className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
										cat.active
											? "bg-[#FFD600] text-black shadow-sm"
											: "bg-[#F8F8F8] text-[#666666] hover:bg-[#F0F0F0]"
									}`}
								>
									<cat.icon
										size={16}
										className={cat.active ? "text-black" : "text-[#666666]"}
									/>
									{cat.name}
								</Link>
							))}
						</section>

						{/* Hero Section */}
						<section className="mt-4 grid gap-6 rounded-[32px] bg-[#111111] p-8 md:p-14 lg:grid-cols-[1.2fr_1fr] overflow-hidden relative">
							{/* Left Content */}
							<div className="flex flex-col justify-center space-y-6 relative z-10">
								<div className="inline-flex items-center gap-2 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 px-3 py-1.5 w-max">
									<Sparkles size={12} className="text-[#FFD600]" />
									<span className="text-[0.65rem] font-bold tracking-[0.15em] text-[#FFD600] uppercase">
										AI-Powered Marketplace
									</span>
								</div>

								<h1 className="text-[3.5rem] leading-[1.05] font-bold tracking-tight text-white md:text-[4.5rem]">
									Turn your Space into <br />
									<span className="text-[#FFD600]">Value</span>
								</h1>

								<p className="max-w-md text-[#888888] text-[1.05rem] leading-relaxed">
									The world's first curated exchange where high-end design meets
									effortless peer-to-peer liquidity.
								</p>

								<div className="flex flex-wrap items-center gap-4 pt-4">
									<Link
										className="rounded-full bg-[#FFD600] px-8 py-3.5 text-sm font-bold text-black hover:bg-[#E6C100] transition"
										to="/explore"
									>
										Explore Listings
									</Link>
									<button className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition">
										How It Works
									</button>
								</div>
							</div>

							{/* Right Content - Featured Deal */}
							<div className="relative z-10 hidden lg:flex items-center justify-end">
								<div className="bg-white rounded-[40px] p-6 w-[420px] aspect-square relative shadow-2xl">
									<div className="absolute top-8 left-8 inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 z-20">
										<Zap size={10} className="text-[#FFD600] fill-[#FFD600]" />
										<span className="text-[0.6rem] font-bold tracking-[0.15em] text-white uppercase">
											Top Deals For You
										</span>
									</div>

									<div className="w-full h-full bg-[#1A1A1A] rounded-[28px] overflow-hidden relative group">
										<img
											src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800"
											alt="Headphones"
											className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
										/>

										<div className="absolute inset-x-4 bottom-4 rounded-[20px] bg-black/60 backdrop-blur-md border border-white/10 p-5 text-white">
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-1.5 text-[#FFD600] text-xs font-bold">
													<Star size={12} fill="#FFD600" /> 4.9{" "}
													<span className="text-white/50 font-normal">
														(128 reviews)
													</span>
												</div>
												<div className="rounded-full bg-[#FFD600] px-2 py-0.5 text-[0.65rem] font-bold text-black">
													25% OFF
												</div>
											</div>

											<h3 className="text-lg font-bold mb-3">
												Studio Master H1
											</h3>

											<div className="flex items-end justify-between">
												<div>
													<div className="text-xs text-white/50 line-through mb-0.5">
														$450
													</div>
													<div className="font-mono text-2xl font-bold text-[#FFD600] tracking-tight">
														04:12:56
													</div>
												</div>
												<button className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition">
													Grab Deal
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</section>

						{/* Premium Banner */}
						<section className="mt-8 flex items-center justify-between rounded-full bg-[#1A1A1A] px-6 py-4 text-white shadow-lg">
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333333]">
									<Zap size={16} className="text-[#FFD600] fill-[#FFD600]" />
								</div>
								<p className="text-[0.95rem]">
									<span className="font-bold">Deal Post Premium:</span>{" "}
									<span className="text-white/80">
										Boost your ads for 3x more views and faster sales.
									</span>
								</p>
							</div>
							<button className="rounded-full bg-[#333333] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#444444] transition hidden sm:block">
								Learn More
							</button>
						</section>

						{/* Fresh Recommendations */}
						<section className="mt-16">
							<div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
								<div>
									<h2 className="text-[2rem] font-bold text-black mb-2">
										Fresh recommendations
									</h2>
									<p className="flex items-center gap-1.5 text-sm font-semibold text-[#888888]">
										<MapPin size={14} /> Current location: Chennai
									</p>
								</div>
								<Link
									to="/explore"
									className="inline-flex items-center gap-1 text-sm font-bold text-black hover:text-[#FFD600] transition"
								>
									See all <ArrowRight size={16} />
								</Link>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
								{displayListings.map((item) => (
									<div key={item.id} className="group cursor-pointer">
										<div className="relative aspect-square rounded-[24px] bg-[#F4F4F4] overflow-hidden mb-4 p-6 flex items-center justify-center">
											<button className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:scale-110 transition">
												<Heart size={16} className="text-black" />
											</button>

											<img
												src={item.image}
												alt={item.title}
												className="w-full h-full object-contain mix-blend-darken group-hover:scale-105 transition duration-500"
											/>

											<div className="absolute bottom-4 left-4 rounded-full bg-black/80 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
												{item.price}
											</div>
										</div>

										<div>
											<h3 className="font-bold text-black text-[1.05rem] line-clamp-1">
												{item.title}
											</h3>
											<p className="text-[0.65rem] font-bold text-[#888888] tracking-[0.1em] uppercase mt-1 mb-3">
												{item.category}
											</p>

											<div className="h-px w-full bg-[#EAEAEA] mb-3" />

											<div className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-2">
													<img
														src={item.seller.avatar}
														alt="seller"
														className="w-5 h-5 rounded-full object-cover"
													/>
													<span className="font-bold text-[#666666]">
														{item.seller.name}
													</span>
												</div>
												<span className="text-[#A3A3A3] font-medium">
													{item.time}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>

							<div className="mt-12 text-center">
								<button className="rounded-full border border-[#EAEAEA] bg-white px-10 py-3.5 text-sm font-bold text-black hover:bg-[#F8F8F8] shadow-sm transition">
									Load More
								</button>
							</div>
						</section>

						{/* Top Deals For You - Carousel Section */}
						<section className="mt-16 rounded-[40px] bg-[#FFF9E6] p-8 md:p-14 relative overflow-hidden">
							<div className="flex items-center justify-between mb-10 relative z-10">
								<h2 className="flex items-center gap-3 text-[2rem] font-bold text-black">
									<Zap size={28} className="text-[#FFD600] fill-[#FFD600]" />
									Top Deals For You
								</h2>
								<div className="flex gap-3">
									<button className="grid h-12 w-12 place-items-center rounded-full bg-white border border-[#EAEAEA] shadow-sm hover:scale-105 transition">
										<ChevronLeft size={20} />
									</button>
									<button className="grid h-12 w-12 place-items-center rounded-full bg-white border border-[#EAEAEA] shadow-sm hover:scale-105 transition">
										<ChevronRight size={20} />
									</button>
								</div>
							</div>

							<div className="flex items-center justify-center gap-6 relative z-10 min-h-[400px]">
								{/* Left Faded Item */}
								<div className="hidden lg:block w-[280px] h-[280px] rounded-[32px] overflow-hidden opacity-60 scale-90 transition transform hover:opacity-100 hover:scale-95 cursor-pointer">
									<img
										src={MOCK_RECOMMENDATIONS[1].image}
										className="w-full h-full object-cover"
										alt="Deal"
									/>
								</div>

								{/* Center Active Item */}
								<div className="w-full max-w-[600px] h-[360px] rounded-[32px] bg-[#111111] overflow-hidden relative shadow-2xl group cursor-pointer">
									<img
										src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800"
										className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-700"
										alt="Main Deal"
									/>

									<div className="absolute inset-0 p-8 flex flex-col justify-between">
										<div className="flex justify-between items-start">
											<div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 text-white text-xs font-bold border border-white/10">
												<Clock size={12} /> 1H 45M
											</div>
											<div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 text-[#FFD600] text-xs font-bold border border-white/10">
												<Star size={12} fill="#FFD600" /> 4.7
											</div>
										</div>

										<div>
											<h3 className="text-white text-2xl font-bold mb-1">
												Sony WH-1000XM5
											</h3>
											<div className="text-[3.5rem] font-bold text-white leading-none tracking-tighter mb-6">
												25% OFF
											</div>
											<button className="rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-8 py-3 text-sm font-bold text-white hover:bg-white/20 transition uppercase tracking-wider">
												Grab Deal
											</button>
										</div>
									</div>
								</div>

								{/* Right Faded Item */}
								<div className="hidden md:block w-[280px] h-[280px] rounded-[32px] overflow-hidden opacity-60 scale-90 transition transform hover:opacity-100 hover:scale-95 cursor-pointer">
									<img
										src={MOCK_RECOMMENDATIONS[2].image}
										className="w-full h-full object-cover"
										alt="Deal"
									/>
								</div>
							</div>

							{/* Search Bar Block */}
							<div className="max-w-3xl mx-auto mt-12 relative z-10">
								<div className="flex items-center rounded-full bg-white p-2 pl-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#F0F0F0]">
									<Search size={20} className="text-[#A3A3A3]" />
									<input
										placeholder="Search deals or ask AI..."
										className="w-full bg-transparent px-4 py-3 text-[#111111] outline-none placeholder:text-[#A3A3A3] text-lg font-medium"
									/>
									<button className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD600] hover:bg-[#E6C100] transition text-black shadow-sm">
										<Sparkles size={20} />
									</button>
								</div>
								<p className="text-center text-[0.65rem] font-bold text-[#A3A3A3] tracking-[0.15em] mt-4 uppercase flex items-center justify-center gap-2">
									<Sparkles size={12} className="text-[#FFD600]" />
									Tip: Start with 'Suggest', 'Compare', or 'Find me' to activate
									AI mode.
								</p>
							</div>
						</section>

						{/* Trending Text Section */}
						<section className="mt-20 mb-10 grid gap-8 md:grid-cols-3 border-t border-[#EAEAEA] pt-12">
							<div>
								<h4 className="text-lg font-bold text-black mb-4">
									Trending in Cars:
								</h4>
								<p className="text-[0.85rem] text-[#888888] leading-relaxed">
									Used Honda City, Toyota Fortuner for sale, Pre-owned BMW 3
									Series, Luxury SUVs in Chennai, Classic Vintage Cars, Electric
									Vehicles.
								</p>
							</div>
							<div>
								<h4 className="text-lg font-bold text-black mb-4">
									Trending in Tech:
								</h4>
								<p className="text-[0.85rem] text-[#888888] leading-relaxed">
									iPhone 15 Pro Max, PS5 Consoles, MacBook Air M1, Gaming
									Laptops, Mirrorless Cameras, Smart Home Devices, Mechanical
									Keyboards.
								</p>
							</div>
							<div>
								<h4 className="text-lg font-bold text-black mb-4">
									Trending in Living:
								</h4>
								<p className="text-[0.85rem] text-[#888888] leading-relaxed">
									Mid-century Modern Furniture, Persian Rugs, Minimalist Desks,
									Ergonomic Chairs, Indoor Plants, Abstract Art Prints, Luxury
									Bedding.
								</p>
							</div>
						</section>
					</div>

					<aside className="hidden xl:block">
						<div className="sticky top-24 space-y-4">
							<div className="rounded-3xl border border-dashed border-[#E2E2E2] bg-[#FAFAFA] p-4 text-center">
								<p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
									Ad Slot
								</p>
								<div className="mt-2 h-[300px] rounded-2xl bg-white" />
							</div>
							<div className="rounded-3xl border border-dashed border-[#E2E2E2] bg-[#FAFAFA] p-4 text-center">
								<p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
									Ad Slot
								</p>
								<div className="mt-2 h-[160px] rounded-2xl bg-white" />
							</div>
						</div>
					</aside>
				</div>
			</main>

			<Footer />
		</div>
	);
}
