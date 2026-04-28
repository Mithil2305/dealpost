// Match the actual generated image widths in `public/images/optimized`.
// This prevents the app from requesting non-existent variants (eg. 320.avif).
const DEFAULT_WIDTHS = [300, 600, 1200];

function isTransformableRemoteImage(url) {
	return /^https:\/\/images\.unsplash\.com\//i.test(String(url || ""));
}

function withSearchParam(url, key, value) {
	const next = new URL(url);
	next.searchParams.set(key, String(value));
	return next.toString();
}

function buildUnsplashSrc(url, width, quality = 75) {
	let next = withSearchParam(url, "auto", "format");
	next = withSearchParam(next, "fit", "crop");
	next = withSearchParam(next, "q", quality);
	next = withSearchParam(next, "w", width);
	next = withSearchParam(next, "fm", "webp");
	return next;
}

function buildLocalVariantSrc(src, width, extension) {
	return String(src || "").replace(
		/-\d+\.(webp|avif)$/i,
		`-${width}.${extension}`,
	);
}

function isLocalOptimizedImage(src) {
	return /\/images\/optimized\/.+-\d+\.webp$/i.test(String(src || ""));
}

export function getResponsiveImageSources(
	src,
	{ widths = DEFAULT_WIDTHS, quality = 75 } = {},
) {
	const resolvedSrc = String(src || "").trim();
	if (!resolvedSrc) {
		return { src: "", srcSet: undefined, avifSrcSet: undefined };
	}

	const uniqueWidths = Array.from(
		new Set(widths.map((value) => Number(value)).filter((value) => value > 0)),
	).sort((a, b) => a - b);

	if (isLocalOptimizedImage(resolvedSrc)) {
		const lastWidth = uniqueWidths[uniqueWidths.length - 1] || 960;
		const srcSet = uniqueWidths
			.map(
				(width) =>
					`${buildLocalVariantSrc(resolvedSrc, width, "webp")} ${width}w`,
			)
			.join(", ");
		const avifSrcSet = uniqueWidths
			.map(
				(width) =>
					`${buildLocalVariantSrc(resolvedSrc, width, "avif")} ${width}w`,
			)
			.join(", ");

		return {
			src: buildLocalVariantSrc(resolvedSrc, lastWidth, "webp"),
			srcSet,
			avifSrcSet,
		};
	}

	if (!isTransformableRemoteImage(resolvedSrc)) {
		return { src: resolvedSrc, srcSet: undefined, avifSrcSet: undefined };
	}

	const srcSet = uniqueWidths
		.map(
			(width) => `${buildUnsplashSrc(resolvedSrc, width, quality)} ${width}w`,
		)
		.join(", ");

	return {
		src: buildUnsplashSrc(
			resolvedSrc,
			uniqueWidths[uniqueWidths.length - 1] || 960,
			quality,
		),
		srcSet,
		avifSrcSet: undefined,
	};
}
