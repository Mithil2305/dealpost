import InfoPageShell from "../components/InfoPageShell";

const sections = [
	{
		heading: "What We Collect",
		body: "We collect account details, profile information, listing data, and usage activity needed to operate the platform.",
		points: [
			"Name, email, and account metadata",
			"Listing content, images, and location context",
			"Message and engagement signals for feature reliability",
		],
	},
	{
		heading: "How Data Is Used",
		body: "Data is used to power marketplace operations, safety review, and product improvement.",
		points: [
			"Deliver core buyer/seller features",
			"Reduce abuse through moderation workflows",
			"Improve relevance and platform performance",
		],
	},
	{
		heading: "Your Choices",
		body: "You can update profile data, deactivate your account, or request account deletion from dashboard settings.",
		points: [
			"Update profile anytime",
			"Deactivate account temporarily",
			"Delete account for permanent removal",
		],
	},
	{
		heading: "Security",
		body: "We apply technical and process controls to protect platform data, but no internet system is risk-free.",
	},
];

const quickLinks = [
	{ label: "Disclaimer", to: "/legal/disclaimer" },
	{ label: "Terms & Conditions", to: "/legal/terms-and-conditions" },
	{ label: "Help Center", to: "/help-center" },
	{ label: "Contact", to: "/contact" },
];

export default function PrivacyPolicy() {
	return (
		<InfoPageShell
			title="Privacy Policy"
			subtitle="This page explains what data Deal Post processes, why it is processed, and the controls available to you."
			sections={sections}
			quickLinks={quickLinks}
		/>
	);
}
