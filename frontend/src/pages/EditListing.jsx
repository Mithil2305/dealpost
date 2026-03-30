import { ImagePlus, MapPin, Rocket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/useAuth";
import { compressImageFile } from "../utils/imageCompressor";
import {
	loadGoogleMapsPlaces,
	mountPlaceAutocompleteElement,
} from "../utils/googleMaps";
import { pickArray } from "../utils/api";

const SPEC_TEMPLATES = [
	{
		match: "Electronics > Mobile Phones",
		fields: [
			"Brand",
			"Model",
			"Color",
			"Storage",
			"RAM",
			"Battery Health",
			"Screen Size",
			"Condition",
		],
	},
	{
		match: "Electronics > Computers & Tech",
		fields: [
			"Brand",
			"Model",
			"Processor",
			"RAM",
			"Storage",
			"Graphics",
			"Display",
			"Condition",
		],
	},
	{
		match: "Vehicles",
		fields: [
			"Brand",
			"Model",
			"Year",
			"Fuel Type",
			"Transmission",
			"Mileage",
			"Ownership",
			"Condition",
		],
	},
];

const DEFAULT_PREVIEW_COORDS = { lat: 13.0827, lng: 80.2707 };

function getCuratedSpecFields(parentCategory, subCategory) {
	const path = [parentCategory, subCategory].filter(Boolean).join(" > ");
	if (!path && !parentCategory) {
		return [
			"Brand/Provider",
			"Model/Type",
			"Color/Variant",
			"Condition",
			"Usage",
			"Warranty",
		];
	}

	const sorted = [...SPEC_TEMPLATES].sort(
		(a, b) => b.match.length - a.match.length,
	);
	const matched = sorted.find((entry) => path.startsWith(entry.match));
	if (matched) return matched.fields;

	const parentMatched = sorted.find((entry) => entry.match === parentCategory);
	if (parentMatched) return parentMatched.fields;

	return [
		"Brand/Provider",
		"Model/Type",
		"Color/Variant",
		"Condition",
		"Usage",
		"Warranty",
	];
}

export default function EditListing() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [categories, setCategories] = useState([]);
	const [files, setFiles] = useState([null, null, null]);
	const [existingImages, setExistingImages] = useState([]);
	const [mapsReady, setMapsReady] = useState(false);
	const [mapsFailed, setMapsFailed] = useState(false);
	const [fallbackQuery, setFallbackQuery] = useState("");
	const [fallbackSuggestions, setFallbackSuggestions] = useState([]);
	const [fallbackSearching, setFallbackSearching] = useState(false);
	const [previews, setPreviews] = useState([null, null, null]);
	const autocompleteContainerRef = useRef(null);
	const mapPreviewRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const mapMarkerRef = useRef(null);
	const mapGeocoderRef = useRef(null);
	const mapListenersBoundRef = useRef(false);
	const [curatedSpecs, setCuratedSpecs] = useState({});
	const [form, setForm] = useState({
		title: "",
		listingType: "fixed",
		parentCategory: "",
		subCategory: "",
		price: "",
		startingBid: "",
		auctionEndsAt: "",
		description: "",
		specifications: "",
		additionalNotes: "",
		address: "",
		latitude: "",
		longitude: "",
		placeId: "",
	});

	// Fetch listing data
	useEffect(() => {
		const fetchListing = async () => {
			try {
				setLoading(true);
				const { data } = await api.get(`/listings/${id}`);
				const listing = data?.listing || data;

				const locationObj = listing?.location || {};
				const locationName =
					typeof locationObj === "string"
						? locationObj
						: locationObj?.name || "";
				const lat = typeof locationObj === "object" ? locationObj?.lat : null;
				const lng = typeof locationObj === "object" ? locationObj?.lng : null;

				setForm({
					title: listing?.title || "",
					listingType: listing?.listingType || "fixed",
					parentCategory: listing?.parentCategory || "",
					subCategory: listing?.subCategory || "",
					price: String(listing?.price || ""),
					startingBid: String(listing?.startingBid || ""),
					auctionEndsAt: listing?.auctionEndsAt
						? new Date(listing.auctionEndsAt).toISOString().slice(0, 16)
						: "",
					description: listing?.description || "",
					specifications: "",
					additionalNotes: listing?.additionalNotes || "",
					address: locationName,
					latitude: lat != null ? String(lat) : "",
					longitude: lng != null ? String(lng) : "",
					placeId: locationObj?.placeId || "",
				});

				// Set existing specs as curated specs
				const specs = listing?.specs || {};
				if (typeof specs === "object" && !Array.isArray(specs)) {
					setCuratedSpecs(specs);
				}

				// Set existing images
				const images = Array.isArray(listing?.images)
					? listing.images
							.map((img) => ({
								url: img?.url || (typeof img === "string" ? img : null),
								public_id: img?.public_id || "",
							}))
							.filter((img) => img.url)
					: [];
				setExistingImages(images);
			} catch {
				toast.error("Could not load listing for editing");
				navigate("/my-listings");
			} finally {
				setLoading(false);
			}
		};

		fetchListing();
	}, [id, navigate]);

	useEffect(() => {
		const nextPreviews = files.map((file) =>
			file ? URL.createObjectURL(file) : null,
		);
		setPreviews(nextPreviews);

		return () => {
			nextPreviews.forEach((url) => {
				if (url) URL.revokeObjectURL(url);
			});
		};
	}, [files]);

	useEffect(() => {
		let active = true;
		const loadMaps = async () => {
			try {
				const { data } = await api.get("/config/public");
				const key = data?.googleMapsBrowserApiKey;
				await loadGoogleMapsPlaces(key);
				if (active) {
					setMapsReady(true);
					setMapsFailed(false);
				}
			} catch {
				if (active) {
					setMapsReady(false);
					setMapsFailed(true);
				}
			}
		};

		loadMaps();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!mapsReady || !autocompleteContainerRef.current) {
			return;
		}

		return mountPlaceAutocompleteElement({
			container: autocompleteContainerRef.current,
			placeholder: "Search and pick a real address...",
			onPlaceSelected: (place) => {
				setForm((prev) => ({
					...prev,
					address: place.formattedAddress || place.displayName || prev.address,
					latitude: Number.isFinite(place.lat) ? String(place.lat) : "",
					longitude: Number.isFinite(place.lng) ? String(place.lng) : "",
					placeId: place.id || "",
				}));
			},
		});
	}, [mapsReady]);

	useEffect(() => {
		if (!mapsFailed) {
			setFallbackSuggestions([]);
			setFallbackSearching(false);
			return;
		}

		const query = fallbackQuery.trim();
		if (query.length < 3) {
			setFallbackSuggestions([]);
			setFallbackSearching(false);
			return;
		}

		const controller = new AbortController();
		const timeoutId = window.setTimeout(async () => {
			try {
				setFallbackSearching(true);
				const params = new URLSearchParams({
					q: query,
					format: "jsonv2",
					addressdetails: "1",
					"accept-language": "en",
					limit: "6",
				});
				const response = await fetch(
					`https://nominatim.openstreetmap.org/search?${params.toString()}`,
					{
						headers: { Accept: "application/json" },
						signal: controller.signal,
					},
				);

				if (!response.ok) {
					throw new Error("Location lookup failed");
				}

				const data = await response.json();
				const suggestions = Array.isArray(data)
					? data
							.map((item) => {
								const lat = Number(item?.lat);
								const lng = Number(item?.lon);
								if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
								return {
									id: String(item?.place_id || `${lat}:${lng}`),
									label: item?.display_name || "",
									lat,
									lng,
								};
							})
							.filter(Boolean)
					: [];

				setFallbackSuggestions(suggestions);
			} catch (error) {
				if (error?.name !== "AbortError") {
					setFallbackSuggestions([]);
				}
			} finally {
				setFallbackSearching(false);
			}
		}, 300);

		return () => {
			controller.abort();
			window.clearTimeout(timeoutId);
		};
	}, [mapsFailed, fallbackQuery]);

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

	const curatedSpecFields = useMemo(
		() => getCuratedSpecFields(form.parentCategory, form.subCategory),
		[form.parentCategory, form.subCategory],
	);

	const onFileChange = (index, file) => {
		if (!file) return;
		setFiles((prev) => {
			const next = [...prev];
			next[index] = file;
			return next;
		});
	};

	const selectFallbackSuggestion = (suggestion) => {
		setForm((prev) => ({
			...prev,
			address: suggestion.label,
			latitude: String(suggestion.lat),
			longitude: String(suggestion.lng),
			placeId: `osm:${suggestion.id}`,
		}));
		setFallbackQuery(suggestion.label);
		setFallbackSuggestions([]);
	};

	const uploadCompressedImageToR2 = async (file) => {
		const compressed = await compressImageFile(file, {
			maxWidth: 1600,
			maxHeight: 1600,
			quality: 0.8,
			outputType: "image/webp",
		});

		try {
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
		} catch {
			const formData = new FormData();
			formData.append("image", compressed, compressed.name);

			const { data } = await api.post("/listings/uploads/direct", formData);

			return {
				url: data?.url,
				public_id: data?.public_id,
			};
		}
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		const isAuctionListing = form.listingType === "auction";

		if (!form.title.trim()) return toast.error("Ad title is required");
		if (!form.parentCategory)
			return toast.error("Please select a parent category");
		if (subOptions.length && !form.subCategory)
			return toast.error("Please select a subcategory");
		if (isAuctionListing) {
			if (!form.startingBid || Number(form.startingBid) <= 0) {
				return toast.error("Please add a valid starting bid");
			}
			if (!form.auctionEndsAt) {
				return toast.error("Please set auction end date and time");
			}
		} else if (!form.price || Number(form.price) <= 0) {
			return toast.error("Please add a valid price");
		}
		if (!form.description.trim()) return toast.error("Description is required");
		if (!form.address.trim()) return toast.error("Pickup location is required");

		try {
			setSubmitting(true);

			const curatedSpecsObject = Object.fromEntries(
				Object.entries(curatedSpecs)
					.map(([key, value]) => [key, String(value || "").trim()])
					.filter(([, value]) => Boolean(value)),
			);

			const customSpecsObject = Object.fromEntries(
				form.specifications
					.split(/\r?\n/)
					.map((line) => line.trim())
					.filter(Boolean)
					.map((line, index) => {
						const [rawKey, ...rawValue] = line.split(":");
						const key = String(rawKey || "").trim();
						const value = rawValue.join(":").trim();
						return [key || `Spec ${index + 1}`, value || "N/A"];
					}),
			);

			const specsObject = {
				...curatedSpecsObject,
				...customSpecsObject,
			};

			// Upload any new files
			const selectedFiles = files.filter(Boolean);
			let uploadedImages = [];
			if (selectedFiles.length) {
				uploadedImages = await Promise.all(
					selectedFiles.map((file) => uploadCompressedImageToR2(file)),
				);
			}

			// Merge with existing images (new uploads replace existing at same index)
			const finalImages = [...existingImages];
			files.forEach((file, index) => {
				if (file && uploadedImages.length) {
					const uploaded = uploadedImages.shift();
					if (uploaded) finalImages[index] = uploaded;
				}
			});
			// Add remaining uploaded images at end
			for (const uploaded of uploadedImages) {
				finalImages.push(uploaded);
			}

			const payload = {
				title: form.title,
				listingType: form.listingType,
				parentCategory: form.parentCategory,
				...(form.subCategory ? { subCategory: form.subCategory } : {}),
				price: form.listingType === "auction" ? form.startingBid : form.price,
				...(form.listingType === "auction"
					? {
							startingBid: form.startingBid,
							auctionEndsAt: form.auctionEndsAt,
						}
					: {}),
				description: form.description,
				specs: specsObject,
				additionalNotes: form.additionalNotes,
				address: form.address,
				latitude: form.latitude,
				longitude: form.longitude,
				...(form.placeId ? { placeId: form.placeId } : {}),
				images: finalImages.filter((img) => img?.url),
			};

			const { data } = await api.put(`/listings/${id}`, payload);
			toast.success("Listing updated successfully");
			navigate(`/listing/${data?.listing?._id || data?.listing?.id || id}`);
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update listing");
		} finally {
			setSubmitting(false);
		}
	};

	const lat = Number(form.latitude);
	const lng = Number(form.longitude);
	const previewLat = Number.isFinite(lat) ? lat : DEFAULT_PREVIEW_COORDS.lat;
	const previewLng = Number.isFinite(lng) ? lng : DEFAULT_PREVIEW_COORDS.lng;
	const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${previewLat},${previewLng}`)}&z=${Number.isFinite(lat) && Number.isFinite(lng) ? 15 : 11}&output=embed`;

	if (loading) {
		return (
			<div className="min-h-screen bg-brand-bg flex flex-col">
				<Navbar />
				<main id="main-content" className="container-shell py-6 flex-1">
					<div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
						<div className="h-[600px] animate-pulse rounded-3xl bg-white" />
						<div className="h-[400px] animate-pulse rounded-3xl bg-white" />
					</div>
				</main>
				<Footer />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main id="main-content" className="container-shell py-6 flex-1">
				<h1 className="text-5xl font-display font-bold">Edit Listing</h1>
				<p className="mt-2 text-brand-muted">
					Update your listing details below.
				</p>

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
								{[0, 1, 2].map((index) => {
									const previewUrl =
										previews[index] || existingImages[index]?.url || null;
									return (
										<label
											key={index}
											className={`relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed ${
												index === 0
													? "col-span-3 sm:col-span-1 sm:h-44"
													: "h-32"
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
											{previewUrl ? (
												<img
													src={previewUrl}
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
									);
								})}
							</div>
						</article>

						<article className="deal-card p-5 sm:p-6">
							<h2 className="text-2xl font-display font-bold">
								Listing Details
							</h2>

							<div className="mt-5 space-y-4">
								<FormField
									id="edit-title"
									name="title"
									label="Ad Title"
									required
									value={form.title}
									onChange={(event) =>
										setForm((prev) => ({
											...prev,
											title: event.target.value,
										}))
									}
									placeholder="Ad title"
									inputClassName="input-shell bg-brand-bg"
								/>

								<div className="grid gap-3 sm:grid-cols-3">
									<FormField
										id="edit-listing-type"
										as="select"
										label="Listing Type"
										value={form.listingType}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												listingType: event.target.value,
											}))
										}
										inputClassName="input-shell bg-brand-bg"
									>
										<option value="fixed">Fixed Price</option>
										<option value="auction">Auction</option>
									</FormField>

									<FormField
										id="edit-parent-category"
										as="select"
										label="Parent Category"
										required
										value={form.parentCategory}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												parentCategory: event.target.value,
												subCategory: "",
											}))
										}
										inputClassName="input-shell bg-brand-bg"
									>
										<option value="">Select Parent Category</option>
										{parentOptions.map((value) => (
											<option key={value} value={value}>
												{value}
											</option>
										))}
									</FormField>

									<FormField
										id="edit-sub-category"
										as="select"
										label="Subcategory"
										value={form.subCategory}
										onChange={(event) =>
											setForm((prev) => ({
												...prev,
												subCategory: event.target.value,
											}))
										}
										disabled={!form.parentCategory || !subOptions.length}
										inputClassName="input-shell bg-brand-bg disabled:opacity-70"
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
									</FormField>

									{form.listingType === "auction" ? (
										<>
											<FormField
												id="edit-starting-bid"
												name="startingBid"
												label="Starting Bid"
												type="number"
												required
												value={form.startingBid}
												onChange={(event) =>
													setForm((prev) => ({
														...prev,
														startingBid: event.target.value,
													}))
												}
												placeholder="Starting Bid"
												inputClassName="input-shell bg-brand-bg"
											/>
											<FormField
												id="edit-auction-end"
												name="auctionEndsAt"
												label="Auction End"
												type="datetime-local"
												required
												value={form.auctionEndsAt}
												onChange={(event) =>
													setForm((prev) => ({
														...prev,
														auctionEndsAt: event.target.value,
													}))
												}
												inputClassName="input-shell bg-brand-bg"
											/>
										</>
									) : (
										<FormField
											id="edit-price"
											name="price"
											label="Price"
											type="number"
											required
											value={form.price}
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													price: event.target.value,
												}))
											}
											placeholder="Price"
											inputClassName="input-shell bg-brand-bg"
										/>
									)}
								</div>

								<FormField
									id="edit-description"
									as="textarea"
									name="description"
									label="Description"
									required
									value={form.description}
									onChange={(event) =>
										setForm((prev) => ({
											...prev,
											description: event.target.value,
										}))
									}
									placeholder="Tell the story behind this item..."
									inputClassName="min-h-40 bg-brand-bg"
								/>

								<div className="rounded-2xl border border-[#E6D9A7] bg-[#FFF9E5] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8B7322]">
										Specifications
									</p>
									<p className="mt-1 text-xs text-[#7B6A26]">
										Update specifications for this listing.
									</p>
									<div className="mt-3 grid gap-3 sm:grid-cols-2">
										{curatedSpecFields.map((field) => (
											<input
												key={field}
												value={curatedSpecs[field] || ""}
												onChange={(event) =>
													setCuratedSpecs((prev) => ({
														...prev,
														[field]: event.target.value,
													}))
												}
												placeholder={field}
												className="input-shell"
											/>
										))}
										{/* Show existing specs that aren't in curated list */}
										{Object.entries(curatedSpecs)
											.filter(
												([key]) => !curatedSpecFields.includes(key),
											)
											.map(([key]) => (
												<input
													key={key}
													value={curatedSpecs[key] || ""}
													onChange={(event) =>
														setCuratedSpecs((prev) => ({
															...prev,
															[key]: event.target.value,
														}))
													}
													placeholder={key}
													className="input-shell"
												/>
											))}
									</div>
								</div>

								<FormField
									id="edit-additional-notes"
									as="textarea"
									name="additionalNotes"
									label="Additional Notes"
									value={form.additionalNotes}
									onChange={(event) =>
										setForm((prev) => ({
											...prev,
											additionalNotes: event.target.value,
										}))
									}
									placeholder="Additional notes (warranty, pickup terms, extra info)"
									inputClassName="min-h-24 bg-brand-bg"
								/>
							</div>

							<Button
								disabled={submitting}
								isLoading={submitting}
								type="submit"
								variant="secondary"
								size="lg"
								className="mt-6 h-14 w-full rounded-2xl text-sm"
							>
								<Rocket size={16} className="mr-2" />{" "}
								{submitting ? "Updating..." : "Update Listing"}
							</Button>
						</article>
					</section>

					<section className="space-y-5">
						<article className="deal-card p-5 sm:p-6">
							<h2 className="flex items-center gap-2 text-2xl font-display font-bold">
								<MapPin size={18} /> Pickup Location
							</h2>
							<div className="mt-4 rounded-2xl border border-brand-border bg-white p-2">
								{mapsReady ? (
									<div
										ref={autocompleteContainerRef}
										className="w-full"
									/>
								) : (
									<div className="space-y-2 px-1 py-1">
										<input
											value={fallbackQuery || form.address}
											onChange={(event) => {
												setFallbackQuery(event.target.value);
												setForm((prev) => ({
													...prev,
													address: event.target.value,
													latitude: "",
													longitude: "",
													placeId: "",
												}));
											}}
											placeholder="Search location"
											className="input-shell"
										/>
										{fallbackSearching ? (
											<div className="px-1 text-xs text-brand-muted">
												Searching...
											</div>
										) : null}
										{fallbackSuggestions.length ? (
											<div className="max-h-44 overflow-auto rounded-xl border border-brand-border">
												{fallbackSuggestions.map((suggestion) => (
													<button
														key={suggestion.id}
														type="button"
														onMouseDown={(event) => {
															event.preventDefault();
															selectFallbackSuggestion(suggestion);
														}}
														className="w-full px-3 py-2 text-left text-xs hover:bg-[#f7f7f7]"
													>
														{suggestion.label}
													</button>
												))}
											</div>
										) : null}
									</div>
								)}
							</div>
							{form.address ? (
								<div className="mt-2 rounded-xl border border-brand-border bg-[#f8f8f8] px-3 py-2 text-sm text-black">
									Selected: {form.address}
								</div>
							) : null}
							<div className="mt-3 overflow-hidden rounded-2xl border border-brand-border bg-white">
								{mapEmbedUrl ? (
									<iframe
										title="Selected pickup location preview"
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
						</article>
					</section>
				</form>
			</main>
			<Footer />
		</div>
	);
}
