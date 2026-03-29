export default function DealCardSkeleton() {
	return (
		<div className="deal-card h-80 overflow-hidden bg-white">
			<div className="h-1/2 animate-pulse bg-[#F2F2F2]" />
			<div className="space-y-3 p-4">
				<div className="h-4 w-1/2 animate-pulse rounded bg-[#EFEFEF]" />
				<div className="h-3 w-3/4 animate-pulse rounded bg-[#F4F4F4]" />
				<div className="h-3 w-2/3 animate-pulse rounded bg-[#F4F4F4]" />
				<div className="h-10 w-full animate-pulse rounded-xl bg-[#F0F0F0]" />
			</div>
		</div>
	);
}
