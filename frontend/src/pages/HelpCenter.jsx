import {
	BookOpen,
	ChevronDown,
	MessageCircle,
	Rocket,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import InfoPageShell from "../components/InfoPageShell";

const sections = [
	{
		heading: "Getting Started",
		body: "Start with profile setup, location selection, and category browsing to make the platform feel personalized immediately.",
		points: [
			"Complete profile basics before posting",
			"Choose accurate category and location",
			"Use clear photos and honest descriptions",
		],
	},
	{
		heading: "Buying Smarter",
		body: "A few practical checks can reduce risk before you commit to any transaction.",
		points: [
			"Review item condition and ask direct questions",
			"Use in-app chat for traceable communication",
			"Report suspicious behavior immediately",
		],
	},
	{
		heading: "Selling Better",
		body: "Well-structured listings get more quality responses and close faster.",
		points: [
			"Title clarity improves discovery",
			"Transparent pricing builds trust",
			"Fast replies increase conversion",
		],
	},
	{
		heading: "Sponsored Ads FAQ",
		body: "Sponsored ads boost visibility but are reviewed by admin before public display.",
		points: [
			"Submit from your user dashboard",
			"Status can be pending, approved, or rejected",
			"Editing a sponsored ad can trigger re-approval",
		],
	},
];

const roadmap = [
	{ title: "Set Up", body: "Account, profile, and location setup." },
	{ title: "Publish", body: "Create listing with complete details." },
	{ title: "Engage", body: "Use messages to qualify buyers/sellers." },
	{
		title: "Resolve",
		body: "Complete transaction and report issues if needed.",
	},
];

const quickLinks = [
	{ label: "About Platform", to: "/about" },
	{ label: "Contact", to: "/contact" },
	{ label: "Disclaimer", to: "/legal/disclaimer" },
	{ label: "Privacy Policy", to: "/legal/privacy-policy" },
];

const guideCards = [
	{
		title: "Learn Basics",
		body: "Understand profile setup, categories, and listing essentials before your first action.",
		icon: BookOpen,
	},
	{
		title: "Build Trust",
		body: "Use complete descriptions, honest pricing, and transparent communication in chat.",
		icon: ShieldCheck,
	},
	{
		title: "Talk Clearly",
		body: "Keep all negotiation details inside in-app messaging for better traceability.",
		icon: MessageCircle,
	},
	{
		title: "Scale Faster",
		body: "Use sponsored ads after your core listings are optimized and ready for more visibility.",
		icon: Rocket,
	},
];

const faqItems = [
	{
		question: "How do I post a listing that gets quality responses?",
		answer:
			"Use a specific title, 3-6 clear images, realistic price, and mention condition and pickup details. Buyers respond faster when key information is upfront.",
	},
	{
		question: "When will my sponsored ad appear publicly?",
		answer:
			"Sponsored ads appear only after admin approval. Pending or rejected ads remain private in your dashboard until updated and approved.",
	},
	{
		question: "What should I do if I see suspicious behavior?",
		answer:
			"Use report options immediately and avoid sharing sensitive data. Include screenshots, listing ID, and conversation context when contacting support.",
	},
	{
		question: "Can I edit a sponsored ad after submission?",
		answer:
			"Yes. Editing is allowed, but major content changes may send the ad back to pending status for another review cycle.",
	},
];

export default function HelpCenter() {
	const [openFaqIndex, setOpenFaqIndex] = useState(0);

	const extraContent = (
		<div className="space-y-4">
			<article className="rounded-3xl border border-gray-200 bg-white p-6">
				<h2 className="text-2xl font-bold text-black">
					Guided Platform Walkthrough
				</h2>
				<p className="mt-2 text-sm text-gray-600">
					These cards explain what to do at each stage so you can use Deal Post
					confidently and efficiently.
				</p>
				<div className="mt-5 grid gap-3 md:grid-cols-2">
					{guideCards.map((item, index) => {
						const Icon = item.icon;
						return (
							<div
								key={item.title}
								className="card-stagger rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4"
								style={{ animationDelay: `${index * 90}ms` }}
							>
								<div className="inline-flex items-center gap-2 rounded-full bg-[#FFF3CA] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-[#7D6200]">
									<Icon size={13} /> {item.title}
								</div>
								<p className="mt-3 text-sm leading-relaxed text-gray-700">
									{item.body}
								</p>
							</div>
						);
					})}
				</div>
			</article>

			<article className="rounded-3xl border border-gray-200 bg-white p-6">
				<h2 className="text-2xl font-bold text-black">
					Frequently Asked Questions
				</h2>
				<p className="mt-2 text-sm text-gray-600">
					Quick answers to common platform, safety, and sponsored-ad questions.
				</p>
				<div className="mt-4 space-y-2">
					{faqItems.map((faq, index) => {
						const isOpen = openFaqIndex === index;
						return (
							<div
								key={faq.question}
								className="card-stagger overflow-hidden rounded-2xl border border-gray-200 bg-[#FCFCFC]"
								style={{ animationDelay: `${index * 80}ms` }}
							>
								<button
									type="button"
									onClick={() =>
										setOpenFaqIndex((prev) => (prev === index ? -1 : index))
									}
									className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
								>
									<span className="text-sm font-semibold text-gray-900">
										{faq.question}
									</span>
									<ChevronDown
										size={16}
										className={`shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
									/>
								</button>
								<div
									className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
								>
									<div className="overflow-hidden">
										<p className="px-4 pb-4 text-sm leading-relaxed text-gray-600">
											{faq.answer}
										</p>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</article>
		</div>
	);

	return (
		<InfoPageShell
			title="Help Center"
			subtitle="Simple guidance, practical steps, and policy-friendly usage tips to help you succeed on Deal Post."
			sections={sections}
			roadmap={roadmap}
			quickLinks={quickLinks}
			extraContent={extraContent}
		/>
	);
}
