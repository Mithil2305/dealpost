function joinClasses(...parts) {
	return parts.filter(Boolean).join(" ");
}

export default function Skeleton({
	className = "",
	as: Element = "div",
	rounded = "rounded-2xl",
}) {
	return (
		<Element
			className={joinClasses(
				"skeleton-wave bg-[length:200%_100%] bg-[linear-gradient(110deg,#f1f3f5_8%,#fafbfc_18%,#f1f3f5_33%)]",
				rounded,
				className,
			)}
			aria-hidden="true"
		/>
	);
}

