import { useState, useMemo } from "react";
import ResponsiveImage from "./ui/ResponsiveImage";

/**
 * ImageDisplay component that renders images with optional crop data
 * Handles both cropped images (showing only the cropped area)
 * and full images (showing the entire image with contain/cover mode)
 *
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {Object} props.cropData - Crop data {useFullImage, crop, displayMode} or undefined
 * @param {string} props.alt - Alt text for image
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.className - CSS class names
 * @param {string} props.displayMode - Default display mode if no crop data ('cover' or 'contain')
 */
export default function ImageDisplay({
	src,
	cropData,
	alt = "Image",
	width,
	height,
	className = "",
	displayMode = "cover",
}) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageDimensions, setImageDimensions] = useState(null);

	// Determine if we should show full image or crop
	const shouldUseCrop = cropData && !cropData.useFullImage && cropData.crop;
	const finalDisplayMode = cropData?.displayMode || displayMode;

	// Calculate cropped area in CSS
	const cropStyles = useMemo(() => {
		if (!shouldUseCrop || !imageDimensions || !cropData.crop) {
			return null;
		}

		const crop = cropData.crop;
		const { naturalWidth, naturalHeight } = imageDimensions;

		// crop.x and crop.y are percentages (0-100)
		// crop.width and crop.height are percentages (0-100)
		return {
			overflow: "hidden",
			position: "relative",
		};
	}, [shouldUseCrop, imageDimensions, cropData]);

	const handleImageLoad = (e) => {
		if (e.target) {
			setImageDimensions({
				naturalWidth: e.target.naturalWidth,
				naturalHeight: e.target.naturalHeight,
			});
		}
		setImageLoaded(true);
	};

	// Container style for cropped images
	const containerStyle = useMemo(() => {
		if (!shouldUseCrop || !imageDimensions || !cropData.crop) {
			// Full image - apply display mode via CSS
			return {
				width: "100%",
				height: "100%",
				objectFit: finalDisplayMode === "cover" ? "cover" : "contain",
				objectPosition: "center",
			};
		}

		// Cropped image display
		const crop = cropData.crop;
		const { naturalWidth, naturalHeight } = imageDimensions;

		// Calculate transform to show only the cropped area
		const cropX = (crop.x / 100) * naturalWidth;
		const cropY = (crop.y / 100) * naturalHeight;
		const cropWidth = (crop.width / 100) * naturalWidth;
		const cropHeight = (crop.height / 100) * naturalHeight;

		return {
			width: "100%",
			height: "100%",
			objectFit: "cover",
			objectPosition: `${crop.x}% ${crop.y}%`,
		};
	}, [shouldUseCrop, imageDimensions, cropData, finalDisplayMode]);

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				...cropStyles,
			}}
			className={className}
		>
			<img
				src={src}
				alt={alt}
				width={width}
				height={height}
				loading="lazy"
				decoding="async"
				onLoad={handleImageLoad}
				style={containerStyle}
			/>
		</div>
	);
}
