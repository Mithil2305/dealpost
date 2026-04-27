import Skeleton from "./Skeleton.jsx";

export default function ChatSkeleton() {
	return (
		<div
			className="flex h-full min-h-[560px] w-full overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm"
			aria-busy="true"
			aria-label="Loading chat"
		>
			<div className="hidden w-[380px] flex-shrink-0 border-r border-gray-100 p-4 md:block">
				<Skeleton className="mb-6 h-11 w-2/5 rounded-full" />
				<Skeleton className="mb-5 h-12 w-full rounded-xl" />
				<div className="space-y-3">
					{Array.from({ length: 6 }).map((_, index) => (
						<div key={index} className="flex items-center gap-4 rounded-2xl p-3">
							<Skeleton className="h-14 w-14 rounded-full" />
							<div className="min-w-0 flex-1 space-y-2">
								<Skeleton className="h-4 w-1/2 rounded-full" />
								<Skeleton className="h-3 w-4/5 rounded-full" />
							</div>
						</div>
					))}
				</div>
			</div>
			<div className="flex flex-1 flex-col">
				<div className="border-b border-gray-100 px-6 py-5">
					<div className="flex items-center gap-4">
						<Skeleton className="h-12 w-12 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-32 rounded-full" />
							<Skeleton className="h-3 w-24 rounded-full" />
						</div>
					</div>
				</div>
				<div className="flex-1 space-y-6 bg-[#FAFAFA] p-6">
					<Skeleton className="mx-auto h-7 w-28 rounded-full" />
					{Array.from({ length: 5 }).map((_, index) => (
						<div
							key={index}
							className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
						>
							<Skeleton
								className={`h-16 ${index % 2 === 0 ? "w-[55%]" : "w-[48%]"} rounded-[24px]`}
							/>
						</div>
					))}
				</div>
				<div className="border-t border-gray-100 p-4 md:p-6">
					<div className="mx-auto flex max-w-4xl items-center gap-3 md:gap-4">
						<Skeleton className="h-12 w-12 rounded-full" />
						<Skeleton className="h-12 flex-1 rounded-full md:h-14" />
						<Skeleton className="h-12 w-12 rounded-full md:h-14 md:w-14" />
					</div>
				</div>
			</div>
		</div>
	);
}

