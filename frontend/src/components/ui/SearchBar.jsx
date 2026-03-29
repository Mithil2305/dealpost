import { Search } from "lucide-react";

export default function SearchBar({
	value,
	onChange,
	onSubmit,
	placeholder = "Search",
	className = "",
	inputClassName = "",
}) {
	return (
		<form
			role="search"
			aria-label="Listing search"
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit?.();
			}}
			className={`flex h-12 items-center rounded-xl border border-brand-border bg-white px-3 ${className}`}
		>
			<Search size={16} className="text-brand-muted" aria-hidden="true" />
			<input
				role="searchbox"
				aria-label="Search listings"
				className={`ml-2 w-full border-none bg-transparent text-sm outline-none ${inputClassName}`}
				value={value}
				onChange={(event) => onChange?.(event.target.value)}
				placeholder={placeholder}
				autoComplete="off"
			/>
		</form>
	);
}
