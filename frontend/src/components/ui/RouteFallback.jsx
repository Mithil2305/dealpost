import FeedSkeleton from "./FeedSkeleton.jsx";
import Skeleton from "./Skeleton.jsx";

export default function RouteFallback() {
	return (
		<div className="min-h-[100dvh] bg-brand-bg">
			<div className="border-b border-brand-border bg-white/95 px-4 py-4 shadow-sm">
				<div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-5 w-28 rounded-full" />
					</div>
					<Skeleton className="hidden h-11 w-[min(50vw,520px)] rounded-full md:block" />
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-10 w-10 rounded-full" />
					</div>
				</div>
			</div>
			<main className="container-shell py-8">
				<Skeleton className="mb-6 h-[280px] w-full rounded-[32px]" />
				<FeedSkeleton count={6} />
			</main>
		</div>
	);
}
