const DEFAULT_WIDTHS = [320, 480, 640, 960, 1280];

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

export function getResponsiveImageSources(
	src,
	{ widths = DEFAULT_WIDTHS, quality = 75 } = {},
) {
	const resolvedSrc = String(src || "").trim();
	if (!resolvedSrc) {
		return { src: "", srcSet: undefined };
	}

	if (!isTransformableRemoteImage(resolvedSrc)) {
		return { src: resolvedSrc, srcSet: undefined };
	}

	const uniqueWidths = Array.from(
		new Set(widths.map((value) => Number(value)).filter((value) => value > 0)),
	).sort((a, b) => a - b);
	const srcSet = uniqueWidths
		.map((width) => `${buildUnsplashSrc(resolvedSrc, width, quality)} ${width}w`)
		.join(", ");

	return {
		src: buildUnsplashSrc(
			resolvedSrc,
			uniqueWidths[uniqueWidths.length - 1] || 960,
			quality,
		),
		srcSet,
	};
}

