import InfoPageShell from "../components/InfoPageShell";

const sections = [
	{
		heading: "What Deal Post Is",
		body: "Deal Post is a local-first marketplace designed to help people list, discover, and buy items with more trust and less friction.",
		points: [
			"Location-aware browsing so buyers see what is relevant nearby",
			"Clear listing details and chat-based communication",
			"Moderation and reporting tools to keep the marketplace safe",
		],
	},
	{
		heading: "How The Platform Helps You",
		body: "Whether you are an individual seller, business account, or buyer, Deal Post gives you focused tools so each action feels predictable.",
		points: [
			"Sellers can publish and manage ads quickly",
			"Buyers can shortlist, like, and message from one place",
			"Admins review sponsored ads before public display",
		],
	},
	{
		heading: "Trust And Safety",
		body: "We combine product-level and account-level controls to reduce spam and misleading listings.",
		points: [
			"User reporting and moderation workflow",
			"Role-based access for admin operations",
			"Transparent legal and help documents",
		],
	},
];

const roadmap = [
	{
		title: "Create Your Account",
		body: "Sign up once, complete your profile, and set your location for better recommendations.",
	},
	{
		title: "List Or Explore",
		body: "Post your ad with clear images and pricing, or browse categories and saved products.",
	},
	{
		title: "Connect And Close",
		body: "Use chat to coordinate safely, finalize details, and complete your transaction confidently.",
	},
	{
		title: "Scale With Sponsored Ads",
		body: "Submit sponsored ads for admin approval to get additional visibility in ad slots.",
	},
];

const quickLinks = [
	{ label: "Contact Us", to: "/contact" },
	{ label: "Help Center", to: "/help-center" },
	{ label: "Privacy Policy", to: "/legal/privacy-policy" },
	{ label: "Terms & Conditions", to: "/legal/terms-and-conditions" },
];

export default function About() {
	return (
		<InfoPageShell
			title="About Deal Post"
			subtitle="A practical marketplace built for clear communication, safer trades, and better local discovery."
			sections={sections}
			roadmap={roadmap}
			quickLinks={quickLinks}
		/>
	);
}
