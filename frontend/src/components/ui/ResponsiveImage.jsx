import { getResponsiveImageSources } from "../../utils/images.js";

export default function ResponsiveImage({
	src,
	alt,
	width,
	height,
	sizes = "100vw",
	className = "",
	loading = "lazy",
	decoding = "async",
	fetchPriority,
	quality = 75,
	widths,
	avifSrcSet,
	webpSrcSet,
	onError,
}) {
	// If webpSrcSet is provided, use src directly; otherwise generate responsive sources
	let resolvedSrc = String(src || "").trim();
	let srcSet;
	let generatedAvifSrcSet;

	if (webpSrcSet) {
		// When webpSrcSet is provided, just use the src as-is (usually the largest variant)
		srcSet = webpSrcSet;
		generatedAvifSrcSet = avifSrcSet;
	} else {
		// Generate responsive sources for remote images
		const result = getResponsiveImageSources(src, {
			widths,
			quality,
		});
		resolvedSrc = result.src;
		srcSet = result.srcSet;
		generatedAvifSrcSet = result.avifSrcSet;
	}

	const finalWebpSrcSet = webpSrcSet || srcSet;
	const finalAvifSrcSet = avifSrcSet || generatedAvifSrcSet;

	if (finalAvifSrcSet || finalWebpSrcSet) {
		return (
			<picture>
				{finalAvifSrcSet ? (
					<source type="image/avif" srcSet={finalAvifSrcSet} sizes={sizes} />
				) : null}
				{finalWebpSrcSet ? (
					<source type="image/webp" srcSet={finalWebpSrcSet} sizes={sizes} />
				) : null}
				<img
					src={resolvedSrc}
					alt={alt}
					width={width}
					height={height}
					loading={loading}
					decoding={decoding}
					fetchPriority={fetchPriority}
					className={className}
					onError={onError}
				/>
			</picture>
		);
	}

	return (
		<img
			src={resolvedSrc}
			srcSet={finalWebpSrcSet}
			sizes={finalWebpSrcSet ? sizes : undefined}
			alt={alt}
			width={width}
			height={height}
			loading={loading}
			decoding={decoding}
			fetchPriority={fetchPriority}
			className={className}
			onError={onError}
		/>
	);
}
