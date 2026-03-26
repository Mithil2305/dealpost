import InfoPageShell from "../components/InfoPageShell";

const sections = [
	{
		heading: "Reach Our Team",
		body: "We aim to respond quickly and clearly. Share the exact issue, listing link, and screenshots when possible.",
		points: [
			"General support: support@dealpost.app",
			"Safety and abuse reports: trust@dealpost.app",
			"Partnerships and business: partners@dealpost.app",
		],
	},
	{
		heading: "Before You Contact",
		body: "Most issues are solved faster if you provide complete context in your first message.",
		points: [
			"Your account email",
			"Listing ID or conversation ID",
			"What you expected vs what happened",
		],
	},
	{
		heading: "Response Expectations",
		body: "We prioritize account security, payment-risk concerns, and policy violations first.",
		points: [
			"Urgent trust/safety concerns: highest priority",
			"Account and listing issues: next business cycle",
			"Feature requests: logged and reviewed in roadmap planning",
		],
	},
];

const roadmap = [
	{
		title: "Collect Details",
		body: "Capture screenshots, IDs, and exact timestamps.",
	},
	{
		title: "Send One Clear Ticket",
		body: "Use one channel to avoid split context and delays.",
	},
	{
		title: "Get Follow-Up",
		body: "Our team replies with next actions and expected timeline.",
	},
	{
		title: "Confirm Resolution",
		body: "We close the issue only after your confirmation.",
	},
];

const quickLinks = [
	{ label: "Help Center", to: "/help-center" },
	{ label: "Disclaimer", to: "/legal/disclaimer" },
	{ label: "Privacy Policy", to: "/legal/privacy-policy" },
	{ label: "Terms & Conditions", to: "/legal/terms-and-conditions" },
];

export default function Contact() {
	return (
		<InfoPageShell
			title="Contact Us"
			subtitle="Need help with listings, account access, sponsored ads, or policy questions? We are here to assist."
			sections={sections}
			roadmap={roadmap}
			quickLinks={quickLinks}
		/>
	);
}
