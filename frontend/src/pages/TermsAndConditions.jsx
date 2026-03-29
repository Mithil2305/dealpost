import InfoPageShell from "../components/InfoPageShell";

const sections = [
	{
		heading: "Acceptance Of Terms",
		body: "By accessing or using Deal Post, you agree to follow these terms, related policies, and applicable laws.",
	},
	{
		heading: "Account Responsibilities",
		body: "You are responsible for account security and all activity performed under your account.",
		points: [
			"Keep login credentials secure",
			"Provide accurate profile information",
			"Do not impersonate others or misuse platform tools",
		],
	},
	{
		heading: "Listing And Conduct Rules",
		body: "Listings must be lawful, truthful, and not misleading. Harmful, fraudulent, or abusive behavior is prohibited.",
		points: [
			"No prohibited or illegal goods",
			"No deceptive pricing or fake listings",
			"No harassment, hate, or threats in messages",
		],
	},
	{
		heading: "Sponsored Content",
		body: "Sponsored ads are subject to review. Admin may approve, reject, or remove sponsored content for policy compliance.",
	},
	{
		heading: "Enforcement And Access",
		body: "We may suspend, limit, or remove accounts and content that violate policy or create platform risk.",
	},
];

const quickLinks = [
	{ label: "Disclaimer", to: "/legal/disclaimer" },
	{ label: "Privacy Policy", to: "/legal/privacy-policy" },
	{ label: "Help Center", to: "/help-center" },
	{ label: "Contact", to: "/contact" },
];

export default function TermsAndConditions() {
	return (
		<InfoPageShell
			title="Terms & Conditions"
			subtitle="Clear platform rules that define responsibilities, acceptable usage, and enforcement standards on Deal Post."
			sections={sections}
			quickLinks={quickLinks}
		/>
	);
}
