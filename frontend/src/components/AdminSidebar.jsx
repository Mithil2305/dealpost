import {
	LayoutDashboard,
	Megaphone,
	Settings,
	Tags,
	Users,
} from "lucide-react";

const items = [
	{ label: "Dashboard", icon: LayoutDashboard, active: true },
	{ label: "Users", icon: Users },
	{ label: "Ads", icon: Megaphone },
	{ label: "Categories", icon: Tags },
	{ label: "Settings", icon: Settings },
];

export default function AdminSidebar({ admin }) {
	return (
		<aside className="flex h-full min-h-screen w-full max-w-[230px] flex-col border-r border-white/10 bg-[#141414] p-4 text-white">
			<div>
				<h1 className="text-2xl font-display font-bold">
					Deal. <span className="text-brand-yellow">Post</span>
				</h1>
				<p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-white/40">
					Control Room
				</p>
			</div>

			<nav className="mt-8 space-y-1.5">
				{items.map((item) => {
					const Icon = item.icon;
					return (
						<button
							key={item.label}
							type="button"
							className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
								item.active
									? "bg-brand-yellow font-semibold text-brand-dark"
									: "text-white/70 hover:bg-white/10 hover:text-white"
							}`}
						>
							<Icon size={16} />
							{item.label}
						</button>
					);
				})}
			</nav>

			<div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
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
						<p className="text-[10px] uppercase tracking-[0.12em] text-brand-yellow">
							Super Admin
						</p>
					</div>
				</div>
			</div>
		</aside>
	);
}
