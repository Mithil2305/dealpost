const VARIANTS = {
	primary:
		"bg-brand-yellow text-brand-dark hover:brightness-95 border border-transparent",
	secondary:
		"bg-brand-dark text-white hover:bg-black border border-transparent",
	outline:
		"bg-white text-brand-dark border border-brand-border hover:bg-brand-bg",
	ghost:
		"bg-transparent text-brand-dark border border-transparent hover:bg-brand-bg",
	danger: "bg-red-600 text-white border border-transparent hover:bg-red-700",
};

const SIZES = {
	sm: "h-9 px-3 text-sm",
	md: "h-11 px-4 text-sm",
	lg: "h-12 px-5 text-[0.95rem]",
	icon: "h-11 w-11",
};

function joinClasses(...parts) {
	return parts.filter(Boolean).join(" ");
}

export default function Button({
	children,
	variant = "primary",
	size = "md",
	type = "button",
	className = "",
	disabled = false,
	isLoading = false,
	ariaLabel,
	...props
}) {
	const isDisabled = disabled || isLoading;

	return (
		<button
			type={type}
			disabled={isDisabled}
			aria-disabled={isDisabled}
			aria-busy={isLoading || undefined}
			aria-label={ariaLabel}
			className={joinClasses(
				"inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
				VARIANTS[variant] || VARIANTS.primary,
				SIZES[size] || SIZES.md,
				className,
			)}
			{...props}
		>
			{isLoading ? "Please wait..." : children}
		</button>
	);
}
