import InfoPageShell from "../components/InfoPageShell";

const sections = [
	{
		heading: "General Information Only",
		body: "Deal Post provides a marketplace platform. Listings are posted by users and may change over time.",
		points: [
			"We do not guarantee listing accuracy from third parties",
			"Buyers and sellers are responsible for independent verification",
			"Platform features may evolve without prior notice",
		],
	},
	{
		heading: "Transaction Responsibility",
		body: "Users are responsible for decisions made during communications and transactions.",
		points: [
			"Check item quality, ownership, and pricing",
			"Avoid unsafe payment requests",
			"Report suspicious activity through platform channels",
		],
	},
	{
		heading: "No Professional Advice",
		body: "Content on this platform does not constitute legal, tax, investment, or professional advice.",
	},
];

const quickLinks = [
	{ label: "Privacy Policy", to: "/legal/privacy-policy" },
	{ label: "Terms & Conditions", to: "/legal/terms-and-conditions" },
	{ label: "Help Center", to: "/help-center" },
	{ label: "Contact", to: "/contact" },
];

export default function Disclaimer() {
	return (
		<InfoPageShell
			title="Disclaimer"
			subtitle="Please review this disclaimer before using Deal Post services and making marketplace decisions."
			sections={sections}
			quickLinks={quickLinks}
		/>
	);
}
