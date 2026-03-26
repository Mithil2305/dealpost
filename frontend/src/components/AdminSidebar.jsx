import {
	LayoutDashboard,
	Megaphone,
	Settings,
	Tags,
	Users,
	Bell,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
	return (
		<aside className="flex h-full min-h-screen w-full max-w-[250px] flex-col border-r border-gray-200 bg-white p-4 text-gray-900">
			<div
				onClick={() => {
					navigate("/");
				}}
				className=" cursor-pointer"
			>
				<h1 className="text-2xl font-display font-bold">
					Deal. <span className="text-brand-yellow	">Post</span>
				</h1>
			</div>

			<nav className="mt-8 space-y-1.5">
				{items.map((item) => {
					const Icon = item.icon;
					const isActive = activeSection === item.key;
					return (
						<button
							key={item.key}
							type="button"
							onClick={() => onSectionChange?.(item.key)}
							className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
								isActive
									? "bg-[#FFF5D1] font-semibold text-[#5C4D00]"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
							}`}
						>
							<Icon size={16} />
							{item.label}
						</button>
					);
				})}
			</nav>

			<div className="mt-auto rounded-2xl border border-gray-200 bg-[#FAFAFA] p-3">
				<div className="flex items-center gap-3">
					<img
						src={admin?.avatar || "https://placehold.co/80x80?text=A"}
						alt={admin?.name || "Admin"}
						className="h-10 w-10 rounded-full object-cover"
					/>
					<div>
						<p className="text-sm font-semibold">
							{admin?.name || "Admin User"}
						</p>
						<p className="text-[10px] uppercase tracking-[0.12em] text-[#C79A00]">
							Super Admin
						</p>
					</div>
				</div>
			</div>
		</aside>
	);
}
