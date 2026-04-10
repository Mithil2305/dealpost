import { Link } from "react-router-dom";
import { Globe, Shield, MapPin } from "lucide-react";

export default function Footer({ variant = "default", className = "" }) {
	const year = new Date().getFullYear();
	if (variant === "auth") {
		return (
			<footer className="w-full px-4 pb-2 pt-8 sm:px-6 lg:px-8 font-sans">
				<div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-between gap-4 text-[0.85rem] text-[#888888] md:flex-row">
					<div className="text-black text-lg">
						<span className="font-bold">Deal</span>
						<span>Post</span>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-6">
						<Link to="/about" className="hover:text-black transition">
							About
						</Link>
						<Link
							to="/legal/terms-and-conditions"
							className="hover:text-black transition"
						>
							Terms & Conditions
						</Link>
						<Link
							to="/legal/privacy-policy"
							className="hover:text-black transition"
						>
							Privacy Policy
						</Link>
						<Link to="/help-center" className="hover:text-black transition">
							Help Center
						</Link>
						<Link to="/contact" className="hover:text-black transition">
							Contact
						</Link>
					</div>
					<div>© {year} Deal Post. The Digital Gallery.</div>
				</div>
			</footer>
		);
	}

	return (
		<footer
			className={`mt-auto w-full bg-[#1A1A1A] px-4 py-10 font-sans text-white sm:px-6 lg:px-8 ${className}`}
		>
			<div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
				{/* Brand & Copyright */}
				<div className="flex flex-col items-center md:items-start gap-2">
					<Link to="/" className="flex items-center gap-2 text-xl">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD600]">
							<MapPin size={12} className="text-black" fill="black" />
						</div>
						<div className="text-white">
							<span className="font-bold">Deal</span>
							<span>Post</span>
						</div>
					</Link>
					<p className="text-[#888888] text-[0.8rem]">
						© {year} Deal Post. The Curated Exchange.
					</p>
				</div>

				{/* Links */}
				<nav className="flex flex-wrap items-center justify-center gap-6 text-[0.85rem] font-medium text-[#A3A3A3]">
					<Link to="/about" className="hover:text-white transition">
						About
					</Link>
					<Link to="/contact" className="hover:text-white transition">
						Contact
					</Link>
					<Link to="/help-center" className="hover:text-white transition">
						Help Center
					</Link>
					<Link to="/legal/disclaimer" className="hover:text-white transition">
						Disclaimer
					</Link>
					<Link
						to="/legal/privacy-policy"
						className="hover:text-white transition"
					>
						Privacy Policy
					</Link>
					<Link
						to="/legal/terms-and-conditions"
						className="hover:text-white transition"
					>
						Terms & Conditions
					</Link>
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
