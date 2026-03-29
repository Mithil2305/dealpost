import Button from "./Button";

export default function Pagination({
	currentPage,
	onPrev,
	onNext,
	disablePrev = false,
	disableNext = false,
	className = "",
}) {
	return (
		<nav
			aria-label="Pagination"
			className={`flex items-center justify-center gap-3 ${className}`}
		>
			<Button
				variant="outline"
				size="md"
				className="rounded-full"
				onClick={onPrev}
				disabled={disablePrev}
				ariaLabel="Go to previous page"
			>
				Previous
			</Button>
			<span
				className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted"
				aria-live="polite"
			>
				Page {currentPage}
			</span>
			<Button
				variant="outline"
				size="md"
				className="rounded-full"
				onClick={onNext}
				disabled={disableNext}
				ariaLabel="Go to next page"
			>
				Next
			</Button>
		</nav>
	);
}
