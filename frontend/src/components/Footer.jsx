import { Link } from "react-router-dom";
import { Globe, Shield, MapPin } from "lucide-react";

export default function Footer({ variant = "default" }) {
	if (variant === "auth") {
		return (
			<footer className="w-full px-4 pb-2 pt-8 sm:px-6 lg:px-8 font-sans">
				<div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-between gap-4 text-[0.85rem] text-[#888888] md:flex-row">
					<div className="text-black text-lg">
						<span className="font-bold">Deal.</span>
						<span>Post</span>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-6">
						<a href="#" className="hover:text-black transition">
							Terms of Service
						</a>
						<a href="#" className="hover:text-black transition">
							Privacy Policy
						</a>
						<a href="#" className="hover:text-black transition">
							Cookie Settings
						</a>
						<a href="#" className="hover:text-black transition">
							Support
						</a>
						<a href="#" className="hover:text-black transition">
							Press
						</a>
					</div>
					<div>© 2024 Deal.Post. The Digital Gallery.</div>
				</div>
			</footer>
		);
	}

	return (
		<footer className="w-full bg-[#1A1A1A] text-white py-10 px-4 sm:px-6 lg:px-8 font-sans">
			<div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
				{/* Brand & Copyright */}
				<div className="flex flex-col items-center md:items-start gap-2">
					<Link to="/" className="flex items-center gap-2 text-xl">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD600]">
							<MapPin size={12} className="text-black" fill="black" />
						</div>
						<div className="text-white">
							<span className="font-bold">Deal.</span>
							<span>Post</span>
						</div>
					</Link>
					<p className="text-[#888888] text-[0.8rem]">
						© 2024 Deal.Post. The Curated Exchange.
					</p>
				</div>

				{/* Links */}
				<nav className="flex flex-wrap items-center justify-center gap-6 text-[0.85rem] font-medium text-[#A3A3A3]">
					<a href="#" className="hover:text-white transition">
						Privacy Policy
					</a>
					<a href="#" className="hover:text-white transition">
						Terms of Service
					</a>
					<a href="#" className="hover:text-white transition">
						Help Center
					</a>
					<a href="#" className="hover:text-white transition">
						Instagram
					</a>
					<a href="#" className="hover:text-white transition">
						Twitter
					</a>
				</nav>

				{/* Badges / Options */}
				<div className="flex items-center gap-4 text-[#FFD600]">
					<button className="hover:text-white transition" aria-label="Language">
						<Globe size={18} />
					</button>
					<button className="hover:text-white transition" aria-label="Security">
						<Shield size={18} />
					</button>
				</div>
			</div>
		</footer>
	);
}
