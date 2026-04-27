import Skeleton from "./Skeleton.jsx";

export default function CardSkeleton({
	className = "",
	imageClassName = "aspect-[4/3] w-full rounded-[18px]",
}) {
	return (
		<article
			className={`deal-card flex h-full min-h-[320px] flex-col overflow-hidden bg-white p-2.5 sm:p-3 ${className}`}
		>
			<Skeleton className={imageClassName} rounded="" />
			<div className="flex flex-1 flex-col gap-3 px-1 pb-2 pt-4">
				<Skeleton className="h-5 w-2/5 rounded-full" />
				<Skeleton className="h-4 w-4/5 rounded-full" />
				<Skeleton className="h-px w-full rounded-none" />
				<div className="mt-auto flex items-end justify-between gap-3">
					<div className="w-full space-y-2">
						<Skeleton className="h-6 w-1/2 rounded-full" />
						<Skeleton className="h-3 w-1/3 rounded-full" />
					</div>
				</div>
				<Skeleton className="h-10 w-full rounded-xl" />
			</div>
		</article>
	);
}

