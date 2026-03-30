const DEFAULT_OPTIONS = {
	maxWidth: 1600,
	maxHeight: 1600,
	quality: 0.8,
	outputType: "image/webp",
};

function loadImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Unable to decode selected image"));
		};
		img.src = url;
	});
}

function getTargetSize(width, height, maxWidth, maxHeight) {
	const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
	return {
		width: Math.max(Math.round(width * ratio), 1),
		height: Math.max(Math.round(height * ratio), 1),
	};
}

let _webpSupported = null;
function isWebpSupported() {
	if (_webpSupported !== null) return _webpSupported;
	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		_webpSupported = canvas
			.toDataURL("image/webp")
			.startsWith("data:image/webp");
	} catch {
		_webpSupported = false;
	}
	return _webpSupported;
}

export async function compressImageFile(file, options = {}) {
	if (!file || !String(file.type || "").startsWith("image/")) {
		throw new Error("Only image files can be compressed");
	}

	const settings = { ...DEFAULT_OPTIONS, ...options };

	// Fallback to JPEG if WebP is not supported by the browser
	if (settings.outputType === "image/webp" && !isWebpSupported()) {
		settings.outputType = "image/jpeg";
	}

	const image = await loadImage(file);
	const { width, height } = getTargetSize(
		image.width,
		image.height,
		settings.maxWidth,
		settings.maxHeight,
	);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Canvas is not supported in this browser");
	}

	context.drawImage(image, 0, 0, width, height);

	const blob = await new Promise((resolve, reject) => {
		canvas.toBlob(
			(result) => {
				if (!result) {
					// If preferred format fails, try JPEG fallback
					if (settings.outputType !== "image/jpeg") {
						canvas.toBlob(
							(jpegResult) => {
								if (!jpegResult) {
									reject(new Error("Image compression failed"));
									return;
								}
								resolve(jpegResult);
							},
							"image/jpeg",
							settings.quality,
						);
						return;
					}
					reject(new Error("Image compression failed"));
					return;
				}
				resolve(result);
			},
			settings.outputType,
			settings.quality,
		);
	});

	const sourceName = file.name || "image";
	const baseName = sourceName.replace(/\.[^.]+$/, "") || "image";
	const isWebp = blob.type === "image/webp";
	const extension = isWebp ? "webp" : "jpg";
	return new File([blob], `${baseName}.${extension}`, {
		type: blob.type || settings.outputType,
		lastModified: Date.now(),
	});
}
