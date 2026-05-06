import {
	LayoutDashboard,
	Megaphone,
	Settings,
	Tags,
	Users,
	Bell,
	Menu,
	X,
	LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";

const items = [
	{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ key: "users", label: "Users", icon: Users },
	{ key: "ads", label: "Listings", icon: Megaphone },
	{ key: "sponsored", label: "Sponsored", icon: Bell },
	{ key: "categories", label: "Categories", icon: Tags },
	{ key: "reports", label: "Reports", icon: Tags },
	{ key: "settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar({
	admin,
	activeSection,
	onSectionChange,
}) {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleLogout = () => {
		logout();
		navigate("/login");
		setIsMobileMenuOpen(false);
	};

	return (
		<>
			{/* Mobile menu toggle button */}
			<div className="lg:hidden fixed top-4 left-4 z-50">
				<button
					type="button"
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className="grid h-10 w-10 place-items-center rounded-lg bg-white border border-gray-200 shadow-lg"
				>
					{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
				</button>
			</div>

			{/* Mobile overlay */}
			{isMobileMenuOpen && (
				<div
					className="lg:hidden fixed inset-0 bg-black/50 z-40"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside className={`
				fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
				flex h-full min-h-screen w-full max-w-[250px] flex-col border-r border-gray-200 bg-white p-4 text-gray-900
				${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
			`}>
				<div
					onClick={() => {
						navigate("/");
						setIsMobileMenuOpen(false);
					}}
					className="cursor-pointer"
				>
					<h1 className="text-xl lg:text-2xl font-display font-bold">
						Deal. <span className="text-brand-yellow">Post</span>
					</h1>
				</div>

				<nav className="mt-6 lg:mt-8 space-y-1.5">
					{items.map((item) => {
						const Icon = item.icon;
						const isActive = activeSection === item.key;
						return (
							<button
								key={item.key}
								type="button"
								onClick={() => {
									onSectionChange?.(item.key);
									setIsMobileMenuOpen(false);
								}}
								className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
									isActive
										? "bg-[#FFF5D1] font-semibold text-[#5C4D00]"
										: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
								}`}
							>
								<Icon size={16} />
								<span className="hidden sm:inline">{item.label}</span>
								<span className="sm:hidden text-xs">{item.label.slice(0, 8)}</span>
							</button>
						);
					})}
				</nav>

				<div className="mt-auto space-y-3">
					<div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] p-3">
						<div className="flex items-center gap-3">
							<img
								src={admin?.avatar || "https://placehold.co/80x80?text=A"}
								alt={admin?.name || "Admin"}
								className="h-10 w-10 rounded-full object-cover"
							/>
							<div>
								<p className="text-sm font-semibold truncate max-w-[120px]">
									{admin?.name || "Admin User"}
								</p>
								<p className="text-[10px] uppercase tracking-[0.12em] text-[#C79A00]">
									Super Admin
								</p>
							</div>
						</div>
					</div>
					
					{/* Signout button */}
					<button
						type="button"
						onClick={handleLogout}
						className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
					>
						<LogOut size={16} />
						<span className="hidden sm:inline">Sign Out</span>
						<span className="sm:hidden text-xs">Sign Out</span>
					</button>
				</div>
			</aside>
		</>
	);
}
