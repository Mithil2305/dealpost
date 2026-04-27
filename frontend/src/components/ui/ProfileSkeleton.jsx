import Skeleton from "./Skeleton.jsx";

export default function ProfileSkeleton() {
	return (
		<div
			className="grid gap-6 lg:grid-cols-[1.35fr_1fr]"
			aria-busy="true"
			aria-label="Loading profile content"
		>
			<div className="rounded-[30px] border border-brand-border bg-white p-4 shadow-sm sm:p-5">
				<Skeleton className="h-[360px] w-full rounded-[26px] sm:h-[460px] lg:h-[560px]" />
				<div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-20 w-full rounded-2xl sm:h-24 lg:h-28" />
					))}
				</div>
			</div>
			<div className="rounded-[30px] border border-brand-border bg-white p-6 shadow-sm sm:p-7 lg:p-8">
				<div className="space-y-5">
					<Skeleton className="h-10 w-4/5 rounded-full" />
					<Skeleton className="h-12 w-2/5 rounded-full" />
					<div className="grid gap-4 rounded-2xl bg-[#F8F8F8] p-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Skeleton className="h-3 w-1/4 rounded-full" />
							<Skeleton className="h-5 w-3/4 rounded-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-3 w-1/4 rounded-full" />
							<div className="flex items-center gap-2">
								<Skeleton className="h-10 w-10 rounded-full" />
								<Skeleton className="h-5 w-1/2 rounded-full" />
							</div>
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl sm:col-span-2" />
					</div>
				</div>
			</div>
		</div>
	);
}

