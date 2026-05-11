import { useState, useCallback, useMemo } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import Cropper from "react-easy-crop";
import Button from "./ui/Button";

/**
 * ImageCropper component for cropping product listing images
 * Allows users to:
 * - Interactively crop images
 * - Preview crops in "cover" and "contain" modes
 * - Toggle between cropped and full image display
 *
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {Object} props.onCropChange - Callback when crop is applied
 * @param {Object} props.initialCrop - Initial crop data {x, y, width, height}
 * @param {string} props.initialDisplayMode - Initial display mode 'cover' or 'contain'
 * @param {Function} props.onClose - Callback when modal is closed
 */
export default function ImageCropper({
	src,
	onCropChange,
	initialCrop = null,
	initialDisplayMode = "cover",
	onClose,
}) {
	const [crop, setCrop] = useState(
		initialCrop || { x: 0, y: 0, width: 100, height: 100 },
	);
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
	const [displayMode, setDisplayMode] = useState(initialDisplayMode);
	const [useFullImage, setUseFullImage] = useState(!initialCrop);
	const [applyCropping, setApplyCropping] = useState(true);

	const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleApply = () => {
		if (useFullImage) {
			// Full image mode - no crop data
			onCropChange({
				useFullImage: true,
				displayMode: "contain",
			});
		} else {
			// Cropped mode
			onCropChange({
				useFullImage: false,
				crop: croppedAreaPixels,
				displayMode,
			});
		}
		onClose?.();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-brand-border p-4 sm:p-6">
					<div>
						<h2 className="text-2xl font-bold text-brand-dark">
							Crop Your Image
						</h2>
						<p className="mt-1 text-sm text-brand-muted">
							Adjust how your image appears on the listing
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-2 hover:bg-gray-100"
						aria-label="Close"
					>
						<X size={24} className="text-brand-muted" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto min-h-0">
					<div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-3">
						{/* Crop Editor */}
						<div className="lg:col-span-2">
							<div className="space-y-4">
								{/* Mode Selection */}
								<div className="rounded-2xl border border-[#E6D9A7] bg-[#FFF9E5] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8B7322]">
										Image Mode
									</p>
									<p className="mt-1 text-xs text-[#7B6A26] mb-3">
										Choose how to display your image
									</p>
									<div className="space-y-2">
										<label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/50 transition">
											<input
												type="radio"
												name="imageMode"
												checked={applyCropping}
												onChange={() => setApplyCropping(true)}
												className="w-4 h-4"
											/>
											<div>
												<p className="font-medium text-sm text-[#8B7322]">
													Crop to fit
												</p>
												<p className="text-xs text-[#7B6A26]">
													Image fills the frame
												</p>
											</div>
										</label>
										<label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/50 transition">
											<input
												type="radio"
												name="imageMode"
												checked={!applyCropping}
												onChange={() => setApplyCropping(false)}
												className="w-4 h-4"
											/>
											<div>
												<p className="font-medium text-sm text-[#8B7322]">
													Show full image
												</p>
												<p className="text-xs text-[#7B6A26]">
													No cropping, full image visible
												</p>
											</div>
										</label>
									</div>
								</div>

								{/* Cropper or Info */}
								{applyCropping ? (
									<div className="space-y-4">
										<div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-brand-border bg-brand-bg">
											<Cropper
												image={src}
												crop={crop}
												zoom={zoom}
												aspect={4 / 3}
												cropShape="rect"
												showGrid={true}
												onCropChange={setCrop}
												onCropComplete={onCropComplete}
												onZoomChange={setZoom}
											/>
										</div>

										{/* Display Mode for Cropped */}
										<div className="rounded-2xl border border-brand-border bg-brand-bg p-4">
											<p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-dark mb-3">
												Display Mode (Cropped)
											</p>
											<div className="grid grid-cols-2 gap-2">
												<button
													type="button"
													onClick={() => setDisplayMode("cover")}
													className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
														displayMode === "cover"
															? "border-brand-yellow bg-brand-yellow/10 text-brand-dark"
															: "border-brand-border bg-white text-brand-muted hover:bg-brand-bg"
													}`}
												>
													Fill
												</button>
												<button
													type="button"
													onClick={() => setDisplayMode("contain")}
													className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
														displayMode === "contain"
															? "border-brand-yellow bg-brand-yellow/10 text-brand-dark"
															: "border-brand-border bg-white text-brand-muted hover:bg-brand-bg"
													}`}
												>
													Fit
												</button>
											</div>
										</div>

										{/* Zoom Controls */}
										<div className="flex items-center gap-3">
											<button
												type="button"
												onClick={() =>
													setZoom((prev) => Math.max(1, prev - 0.2))
												}
												className="rounded-lg border border-brand-border p-2 hover:bg-brand-bg"
												aria-label="Zoom out"
											>
												<ZoomOut size={18} />
											</button>
											<input
												type="range"
												min="1"
												max="3"
												step="0.1"
												value={zoom}
												onChange={(e) => setZoom(Number(e.target.value))}
												className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-brand-border"
											/>
											<button
												type="button"
												onClick={() =>
													setZoom((prev) => Math.min(3, prev + 0.2))
												}
												className="rounded-lg border border-brand-border p-2 hover:bg-brand-bg"
												aria-label="Zoom in"
											>
												<ZoomIn size={18} />
											</button>
											<span className="text-sm font-medium text-brand-muted w-12 text-right">
												{zoom.toFixed(1)}x
											</span>
										</div>
									</div>
								) : (
									<div className="rounded-2xl border border-brand-border bg-brand-bg p-6 my-4">
										<p className="text-sm text-brand-dark">
											✓ Full image will be displayed without any cropping
										</p>
										<p className="mt-2 text-xs text-brand-muted">
											The entire image will be visible. If the aspect ratio
											doesn't match the frame, you may see empty space on the
											sides or top/bottom.
										</p>
									</div>
								)}
							</div>
						</div>

						{/* Preview Panel */}
						<div className="space-y-4">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-dark mb-3">
									Preview
								</p>

								{/* Cover/Fit Preview */}
								{applyCropping && (
									<div className="rounded-2xl border border-brand-border overflow-hidden bg-brand-bg">
										<div
											className="aspect-square overflow-hidden"
											style={{
												backgroundImage: `url(${src})`,
												backgroundPosition: `${-croppedAreaPixels?.x || 0}px ${-croppedAreaPixels?.y || 0}px`,
												backgroundSize: `${(croppedAreaPixels?.width || 0) * (crop.width / 100)}px auto`,
												backgroundRepeat: "no-repeat",
											}}
										/>
										<div className="p-2 bg-white text-center">
											<p className="text-xs font-medium text-brand-dark">
												{displayMode === "cover"
													? "Fills frame"
													: "Fits in frame"}
											</p>
										</div>
									</div>
								)}

								{/* Full Image Preview */}
								{!applyCropping && (
									<div className="rounded-2xl border border-brand-border overflow-hidden bg-brand-bg">
										<div className="aspect-video overflow-hidden flex items-center justify-center">
											<img
												src={src}
												alt="Full preview"
												className="w-full h-full object-contain"
											/>
										</div>
										<div className="p-2 bg-white text-center">
											<p className="text-xs font-medium text-brand-dark">
												Full image
											</p>
										</div>
									</div>
								)}

								{/* Info */}
								<div className="mt-4 rounded-2xl border border-[#E6D9A7] bg-[#FFF9E5] p-3 text-xs text-[#7B6A26]">
									<p className="font-medium text-[#8B7322] mb-1">💡 Pro Tip</p>
									<p>
										{applyCropping
											? "Drag to reposition, scroll to zoom"
											: "Users will see your full image, no parts cut off"}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex gap-3 border-t border-brand-border bg-brand-bg p-4 sm:p-6">
					<Button
						type="button"
						onClick={onClose}
						variant="outline"
						className="flex-1 rounded-xl"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleApply}
						variant="secondary"
						className="flex-1 rounded-xl"
					>
						Apply
					</Button>
				</div>
			</div>
		</div>
	);
}
