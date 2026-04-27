import CardSkeleton from "./CardSkeleton.jsx";

export default function FeedSkeleton({
	count = 6,
	minCardWidth = 250,
	className = "",
}) {
	return (
		<section
			aria-label="Loading content"
			className={`grid grid-cols-2 gap-3 sm:gap-4 md:[grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--feed-min-card-width)),1fr))] ${className}`}
			style={{ "--feed-min-card-width": `${minCardWidth}px` }}
		>
			{Array.from({ length: count }).map((_, index) => (
				<CardSkeleton key={index} />
			))}
		</section>
	);
}

