function joinClasses(...parts) {
	return parts.filter(Boolean).join(" ");
}

export default function DealGrid({
	children,
	className = "",
	minCardWidth = 260,
	ariaLabel = "Deal listings",
}) {
	return (
		<section
			aria-label={ariaLabel}
			className={joinClasses(
				"grid grid-cols-2 gap-3 sm:gap-4 md:[grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--deal-min-card-width)),1fr))]",
				className,
			)}
			style={{
				"--deal-min-card-width": `${minCardWidth}px`,
			}}
		>
			{children}
		</section>
	);
}
