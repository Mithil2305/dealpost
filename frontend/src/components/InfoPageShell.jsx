import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function InfoPageShell({
	title,
	subtitle,
	sections = [],
	roadmap = [],
	quickLinks = [],
	extraContent = null,
}) {
	return (
		<div className="min-h-screen bg-[#F7F8FA] text-gray-900">
			<Navbar />
			<main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
				<header className="relative overflow-hidden rounded-[32px] bg-[#111111] px-7 py-10 text-white sm:px-10">
					<div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-[#FFD600]/30 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-[#FFFFFF]/10 blur-3xl" />
					<div className="relative z-10 max-w-3xl animate-rise-in">
						<p className="inline-flex items-center gap-2 rounded-full border border-[#FFD600]/40 bg-[#FFD600]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD600]">
							<Sparkles size={13} /> Deal.Post Guide
						</p>
						<h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
							{title}
						</h1>
						<p className="mt-4 text-sm leading-relaxed text-white/80 sm:text-base">
							{subtitle}
						</p>
					</div>
				</header>

				{quickLinks.length ? (
					<section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{quickLinks.map((item, index) => (
							<Link
								key={item.to}
								to={item.to}
								className="card-stagger rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-[#FFD600] hover:text-black"
								style={{ animationDelay: `${index * 80}ms` }}
							>
								<div className="flex items-center justify-between gap-3">
									<span>{item.label}</span>
									<ArrowRight size={14} />
								</div>
							</Link>
						))}
					</section>
				) : null}

				<section className="mt-8 space-y-4">
					{sections.map((section, index) => (
						<article
							key={section.heading}
							className="card-stagger rounded-3xl border border-gray-200 bg-white p-6"
							style={{ animationDelay: `${index * 120}ms` }}
						>
							<h2 className="text-2xl font-bold text-black">
								{section.heading}
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-gray-600">
								{section.body}
							</p>
							{Array.isArray(section.points) && section.points.length ? (
								<ul className="mt-4 space-y-2 text-sm text-gray-700">
									{section.points.map((point) => (
										<li key={point} className="flex items-start gap-2">
											<span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#D6A700]" />
											<span>{point}</span>
										</li>
									))}
								</ul>
							) : null}
						</article>
					))}
				</section>

				{roadmap.length ? (
					<section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6">
						<h2 className="text-2xl font-bold text-black">Simple Roadmap</h2>
						<p className="mt-2 text-sm text-gray-600">
							Follow these steps to get results quickly and safely on Deal.Post.
						</p>
						<div className="mt-5 grid gap-3 md:grid-cols-2">
							{roadmap.map((step, index) => (
								<div
									key={step.title}
									className="card-stagger rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4"
									style={{ animationDelay: `${index * 100}ms` }}
								>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A38100]">
										Step {index + 1}
									</p>
									<h3 className="mt-1 text-base font-bold text-black">
										{step.title}
									</h3>
									<p className="mt-1 text-sm text-gray-600">{step.body}</p>
								</div>
							))}
						</div>
					</section>
				) : null}

				{extraContent ? (
					<section className="mt-8">{extraContent}</section>
				) : null}
			</main>
			<Footer />
		</div>
	);
}
