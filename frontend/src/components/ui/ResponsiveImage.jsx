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
	onError,
}) {
	const { src: resolvedSrc, srcSet } = getResponsiveImageSources(src, {
		widths,
		quality,
	});

	return (
		<img
			src={resolvedSrc}
			srcSet={srcSet}
			sizes={srcSet ? sizes : undefined}
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

