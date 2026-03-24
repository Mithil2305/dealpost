import { ImagePlus, MapPin, Rocket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { compressImageFile } from "../utils/imageCompressor";
import { loadGoogleMapsPlaces } from "../utils/googleMaps";
import { pickArray } from "../utils/api";

export default function PostAd({ variant = "personal" }) {
	const navigate = useNavigate();
	const isBusinessFlow = variant === "business";
	const pageTitle = isBusinessFlow
		? "Register Business Listing"
		: "Start Listing";
	const pageSubtitle = isBusinessFlow
		? "Launch your storefront inventory with verified business details."
		: "Transform your items into opportunities.";
	const submitLabel = isBusinessFlow ? "Publish Business Ad" : "Publish Ad";
	const premiumTitle = isBusinessFlow ? "Boost Business Reach?" : "Go Premium?";
	const premiumDescription = isBusinessFlow
		? "Highlight your business listing in local search and category feeds for 7 days."
		: "Boost your ad to top of Trending for 7 days.";
	const [submitting, setSubmitting] = useState(false);
	const [categories, setCategories] = useState([]);
	const [files, setFiles] = useState([null, null, null]);
	const [mapsReady, setMapsReady] = useState(false);
	const addressInputRef = useRef(null);
	const [form, setForm] = useState({
		title: "",
		parentCategory: "",
		subCategory: "",
		price: "",
		description: "",
		address: "",
		latitude: "",
		longitude: "",
		placeId: "",
		premiumBoost: false,
	});

	const previews = useMemo(
		() => files.map((file) => (file ? URL.createObjectURL(file) : null)),
		[files],
	);

	useEffect(() => {
		let active = true;
		const loadMaps = async () => {
			try {
				const { data } = await api.get("/config/public");
				const key = data?.googleMapsBrowserApiKey;
				await loadGoogleMapsPlaces(key);
				if (active) setMapsReady(true);
			} catch {
				toast.error("Google Maps could not be loaded");
			}
		};

		loadMaps();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (
			!mapsReady ||
			!addressInputRef.current ||
			!window.google?.maps?.places
		) {
			return;
		}

		const autocomplete = new window.google.maps.places.Autocomplete(
			addressInputRef.current,
			{
				fields: ["formatted_address", "geometry", "place_id", "name"],
				types: ["geocode"],
			},
		);

		const listener = autocomplete.addListener("place_changed", () => {
			const place = autocomplete.getPlace();
			const lat = place?.geometry?.location?.lat?.();
			const lng = place?.geometry?.location?.lng?.();

			setForm((prev) => ({
				...prev,
				address: place?.formatted_address || place?.name || prev.address,
				latitude: Number.isFinite(lat) ? String(lat) : "",
				longitude: Number.isFinite(lng) ? String(lng) : "",
				placeId: place?.place_id || "",
			}));
		});

		return () => {
			if (listener?.remove) listener.remove();
		};
	}, [mapsReady]);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const { data } = await api.get("/categories");
				setCategories(pickArray(data, ["categories", "data", "items"]));
			} catch {
				toast.error("Could not load categories");
			}
		};

		fetchCategories();
	}, []);

	const categoryNames = useMemo(
		() =>
			categories.map((category) => category?.name || category).filter(Boolean),
		[categories],
	);

	const parentOptions = useMemo(() => {
		const seen = new Set();
		for (const name of categoryNames) {
			const parent = String(name).split(">")[0]?.trim();
			if (parent) seen.add(parent);
		}
		return Array.from(seen);
	}, [categoryNames]);

	const subOptions = useMemo(() => {
		if (!form.parentCategory) return [];
		const prefix = `${form.parentCategory} > `;
		const seen = new Set();

		for (const name of categoryNames) {
			if (String(name).startsWith(prefix)) {
				const remainder = String(name).slice(prefix.length).trim();
				if (remainder) seen.add(remainder);
			}
		}

		return Array.from(seen).sort((a, b) => a.localeCompare(b));
	}, [categoryNames, form.parentCategory]);

	const onFileChange = (index, file) => {
		if (!file) return;
		setFiles((prev) => {
			const next = [...prev];
			next[index] = file;
			return next;
		});
	};

	const uploadCompressedImageToR2 = async (file) => {
		const compressed = await compressImageFile(file, {
			maxWidth: 1600,
			maxHeight: 1600,
			quality: 0.8,
			outputType: "image/webp",
		});

		const { data } = await api.post("/listings/uploads/presign", {
			fileName: compressed.name,
			contentType: compressed.type,
		});

		const response = await fetch(data?.uploadUrl, {
			method: "PUT",
			headers: {
				"Content-Type": compressed.type,
			},
			body: compressed,
		});

		if (!response.ok) {
			throw new Error("Failed to upload image to storage");
		}

		return {
			url: data?.publicUrl,
			public_id: data?.key,
		};
	};

	const onSubmit = async (event) => {
		event.preventDefault();

		if (!form.title.trim()) return toast.error("Ad title is required");
		if (!form.parentCategory)
			return toast.error("Please select a parent category");
		if (subOptions.length && !form.subCategory)
			return toast.error("Please select a subcategory");
		if (!form.price || Number(form.price) <= 0)
			return toast.error("Please add a valid price");
		if (!form.description.trim()) return toast.error("Description is required");
		if (!form.address.trim()) return toast.error("Pickup location is required");
		if (!form.latitude || !form.longitude) {
			return toast.error("Please choose a valid location from suggestions");
		}
		if (!files[0]) return toast.error("Please add a hero image");

		try {
			setSubmitting(true);
			const selectedFiles = files.filter(Boolean);
			const uploadedImages = await Promise.all(
				selectedFiles.map((file) => uploadCompressedImageToR2(file)),
			);

			const payload = {
				title: form.title,
				parentCategory: form.parentCategory,
				...(form.subCategory ? { subCategory: form.subCategory } : {}),
				price: form.price,
				description: form.description,
				address: form.address,
				latitude: form.latitude,
				longitude: form.longitude,
				...(form.placeId ? { placeId: form.placeId } : {}),
				premiumBoost: form.premiumBoost,
				images: uploadedImages,
			};

			const { data } = await api.post("/listings", payload);
			toast.success("Listing published");
			navigate(`/listing/${data?.listing?._id || data?.listing?.id || ""}`);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to publish ad");
		} finally {
			setSubmitting(false);
		}
	};

	const mapEmbedUrl =
		form.latitude && form.longitude
			? `https://www.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}&z=15&output=embed`
			: null;

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main className="container-shell py-6 flex-1">
				<h1 className="text-5xl font-display font-bold">{pageTitle}</h1>
				<p className="mt-2 text-brand-muted">{pageSubtitle}</p>

				<form
					className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"
					onSubmit={onSubmit}
				>
					<section className="space-y-5">
						<article className="deal-card p-5 sm:p-6">
							<h2 className="flex items-center gap-2 text-2xl font-display font-bold">
								<ImagePlus size={20} /> Visual Identity
							</h2>

							<div className="mt-5 grid grid-cols-3 gap-3">
								{files.map((file, index) => (
									<label
										key={index}
										className={`relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed ${
											index === 0 ? "col-span-3 sm:col-span-1 sm:h-44" : "h-32"
										} border-[#decf98] bg-[#faf8ef] text-brand-muted`}
									>
										<input
											type="file"
											className="hidden"
											accept="image/*"
											onChange={(event) =>
												onFileChange(index, event.target.files?.[0])
											}
										/>
										{previews[index] ? (
											<img
												src={previews[index]}
												alt="Upload preview"
												className="absolute inset-0 h-full w-full rounded-2xl object-cover"
											/>
										) : (
											<>
												<ImagePlus size={20} />
												<span className="mt-2 text-xs">
													{index === 0 ? "Add Hero Image" : "Add Image"}
												</span>
											</>
										)}
									</label>
								))}
							</div>
						</article>

						<article className="deal-card p-5 sm:p-6">
							<h2 className="text-2xl font-display font-bold">
								Listing Details
							</h2>

							<div className="mt-5 space-y-4">
								<input
									value={form.title}
									onChange={(event) =>
										setForm((prev) => ({ ...prev, title: event.target.value }))
									}
									placeholder="Ad title"
									className="input-shell"
								/>
								<div className="grid gap-3 sm:grid-cols-3">
									<select
										value={form.parentCategory}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												parentCategory: event.target.value,
												subCategory: "",
											}))
										}
										className="input-shell"
									>
										<option value="">Select Parent Category</option>
										{parentOptions.map((value) => {
											return (
												<option key={value} value={value}>
													{value}
												</option>
											);
										})}
									</select>

									<select
										value={form.subCategory}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												subCategory: event.target.value,
											}))
										}
										disabled={!form.parentCategory || !subOptions.length}
										className="input-shell disabled:opacity-70"
									>
										<option value="">
											{subOptions.length
												? "Select Subcategory"
												: "No subcategory required"}
										</option>
										{subOptions.map((value) => (
											<option key={value} value={value}>
												{value}
											</option>
										))}
									</select>

									<input
										value={form.price}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												price: event.target.value,
											}))
										}
										type="number"
										placeholder="Price"
										className="input-shell"
									/>
								</div>

								<textarea
									value={form.description}
									onChange={(event) =>
										setForm((prev) => ({
											...prev,
											description: event.target.value,
										}))
									}
									className="min-h-40 w-full rounded-2xl border border-transparent bg-brand-bg p-4 outline-none ring-brand-yellow transition focus:border-brand-yellow focus:ring-2"
									placeholder="Tell the story behind this item..."
								/>
							</div>

							<button
								disabled={submitting}
								type="submit"
								className="btn-secondary mt-6 h-14 w-full rounded-2xl text-sm"
							>
								<Rocket size={16} className="mr-2" />{" "}
								{submitting ? "Publishing..." : submitLabel}
							</button>
						</article>
					</section>

					<section className="space-y-5">
						<article className="deal-card p-5 sm:p-6">
							<h2 className="flex items-center gap-2 text-2xl font-display font-bold">
								<MapPin size={18} /> Pickup Location
							</h2>
							<input
								ref={addressInputRef}
								className="input-shell mt-4"
								value={form.address}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										address: event.target.value,
										latitude: "",
										longitude: "",
										placeId: "",
									}))
								}
								placeholder="Search and pick a real address..."
							/>
							<div className="mt-3 overflow-hidden rounded-2xl border border-brand-border bg-white">
								{mapEmbedUrl ? (
									<iframe
										title="Selected pickup location"
										src={mapEmbedUrl}
										className="h-56 w-full"
										loading="lazy"
										referrerPolicy="no-referrer-when-downgrade"
									/>
								) : (
									<div className="grid h-56 place-items-center bg-[#f8f8f8] text-sm text-brand-muted">
										Pick a valid address to preview map
									</div>
								)}
							</div>
							<p className="mt-2 text-xs text-brand-muted">
								Only verified map locations are accepted for publishing.
							</p>
						</article>

						<article className="rounded-3xl bg-[#2b2b2b] p-5 text-white">
							<h3 className="text-2xl font-display font-bold">
								{premiumTitle}
							</h3>
							<p className="mt-1 text-sm text-white/70">{premiumDescription}</p>

							<label className="mt-4 flex items-center justify-between rounded-xl border border-white/20 bg-white/5 p-3">
								<span className="inline-flex items-center gap-2 text-sm">
									<Rocket size={14} className="text-brand-yellow" /> Deal.Plus
									Boost
								</span>
								<span className="font-mono text-brand-yellow">+$14.99</span>
								<input
									type="checkbox"
									checked={form.premiumBoost}
									onChange={(event) =>
										setForm((prev) => ({
											...prev,
											premiumBoost: event.target.checked,
										}))
									}
								/>
							</label>
						</article>
					</section>
				</form>

				<Footer />
			</main>
		</div>
	);
}
