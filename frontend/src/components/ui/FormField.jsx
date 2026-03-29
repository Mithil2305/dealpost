function joinClasses(...parts) {
	return parts.filter(Boolean).join(" ");
}

export default function FormField({
	id,
	label,
	error,
	hint,
	required = false,
	as = "input",
	children,
	inputClassName = "",
	wrapperClassName = "",
	labelClassName = "",
	rightAdornment = null,
	...inputProps
}) {
	const Component = as;
	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<div className={joinClasses("space-y-2", wrapperClassName)}>
			{label ? (
				<label
					htmlFor={id}
					className={joinClasses(
						"block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#666666]",
						labelClassName,
					)}
				>
					{label}
					{required ? " *" : ""}
				</label>
			) : null}

			<div className="relative">
				<Component
					id={id}
					required={required}
					aria-required={required || undefined}
					aria-invalid={Boolean(error)}
					aria-describedby={describedBy}
					className={joinClasses(
						"w-full rounded-xl bg-[#F1F1F1] text-[0.95rem] text-black outline-none placeholder:text-[#A3A3A3] focus:ring-2 focus:ring-[#FFD600]/50",
						as === "textarea" ? "min-h-[110px] px-4 py-3" : "h-12 px-4",
						rightAdornment ? "pr-12" : "",
						inputClassName,
					)}
					{...inputProps}
				>
					{children}
				</Component>
				{rightAdornment ? (
					<div className="absolute inset-y-0 right-2 flex items-center">
						{rightAdornment}
					</div>
				) : null}
			</div>

			{hint ? (
				<p id={hintId} className="text-xs text-[#7A7A7A]">
					{hint}
				</p>
			) : null}
			{error ? (
				<p
					id={errorId}
					role="alert"
					className="text-xs font-medium text-red-600"
				>
					{error}
				</p>
			) : null}
		</div>
	);
}
