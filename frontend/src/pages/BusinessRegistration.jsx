import { useEffect, useMemo, useRef, useState } from "react";
import {
	Building2,
	ChevronDown,
	Check,
	FileText,
	ImagePlus,
	Shield,
	ShieldCheck,
	Store,
	Tags,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/useAuth";
import { pickArray } from "../utils/api";
import { compressImageFile } from "../utils/imageCompressor";
import { mountPlaceAutocompleteElement } from "../utils/googleMaps";
import {
	fetchOpenStreetSuggestions,
	hasValidCoordinates,
	loadGoogleMapsFromPublicConfig,
	mapAutocompletePlaceToLocation,
} from "../utils/locationHelpers";

const DEFAULT_PREVIEW_COORDS = { lat: 13.0827, lng: 80.2707 };

const createGoogleMapsLink = ({ lat, lng, placeId }) => {
	const numericLat = Number(lat);
	const numericLng = Number(lng);
	if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) return "";

	const params = new URLSearchParams({
		api: "1",
		query: `${numericLat},${numericLng}`,
	});

	if (String(placeId || "").trim()) {
		params.set("query_place_id", String(placeId).trim());
	}

	return `https://www.google.com/maps/search/?${params.toString()}`;
};

export default function BusinessRegistration() {
	const navigate = useNavigate();
	const { user, setCurrentUser } = useAuth();
	const [categories, setCategories] = useState([]);
	const [submitting, setSubmitting] = useState(false);
	const [showValidation, setShowValidation] = useState(false);
	const [logoFile, setLogoFile] = useState(null);
	const [bannerFile, setBannerFile] = useState(null);
	const [logoPreview, setLogoPreview] = useState("");
	const [bannerPreview, setBannerPreview] = useState("");
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
	const [mapsReady, setMapsReady] = useState(false);
	const [mapsFailed, setMapsFailed] = useState(false);
	const [fallbackQuery, setFallbackQuery] = useState("");
	const [fallbackSuggestions, setFallbackSuggestions] = useState([]);
	const [fallbackSearching, setFallbackSearching] = useState(false);
	const [businessLocation, setBusinessLocation] = useState({
		label: "",
		latitude: "",
		longitude: "",
		placeId: "",
	});
	const categoryPickerRef = useRef(null);
	const autocompleteContainerRef = useRef(null);
	const mapPreviewRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const mapMarkerRef = useRef(null);
	const mapGeocoderRef = useRef(null);
	const mapListenersBoundRef = useRef(false);
	const [formData, setFormData] = useState({
		businessName: "",
		description: "",
		gstOrMsme: "",
		category: "",
		additionalCategory: "",
	});

	const categoryNames = useMemo(
		() =>
			categories
				.map((category) => String(category?.name || category || "").trim())
				.filter(Boolean),
		[categories],
	);

	const categorySections = useMemo(() => {
		const grouped = new Map();

		for (const path of categoryNames) {
			const parts = path
				.split(">")
				.map((segment) => segment.trim())
				.filter(Boolean);
			if (!parts.length) continue;

			const title = parts[0];
			const groupLabel = parts[1] || "More";
			const leafLabel = parts.slice(2).join(" > ");

			if (!grouped.has(title)) {
				grouped.set(title, new Map());
			}

			const groupMap = grouped.get(title);
			if (!groupMap.has(groupLabel)) {
				groupMap.set(groupLabel, new Set());
			}

			if (leafLabel) {
				groupMap.get(groupLabel).add(leafLabel);
			}
		}

		return Array.from(grouped.entries())
			.map(([title, groupMap]) => ({
				title,
				groups: Array.from(groupMap.entries())
					.map(([label, itemSet]) => ({
						label,
						items: Array.from(itemSet).sort((a, b) => a.localeCompare(b)),
					}))
					.sort((a, b) => a.label.localeCompare(b.label)),
			}))
			.sort((a, b) => a.title.localeCompare(b.title));
	}, [categoryNames]);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (!categoryPickerRef.current?.contains(event.target)) {
				setIsCategoryPickerOpen(false);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
		};
	}, []);

	useEffect(() => {
		let active = true;

		const fetchCategories = async () => {
			try {
				const { data } = await api.get("/categories");
				const rows = pickArray(data, ["categories", "data", "items"]);
				if (active) {
					setCategories(rows);
				}
			} catch {
				if (active) {
					setCategories([]);
				}
			}
		};

		fetchCategories();
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		return () => {
			if (logoPreview) {
				URL.revokeObjectURL(logoPreview);
			}
		};
	}, [logoPreview]);

	useEffect(() => {
		return () => {
			if (bannerPreview) {
				URL.revokeObjectURL(bannerPreview);
			}
		};
	}, [bannerPreview]);

	useEffect(() => {
		let active = true;

		const loadMaps = async () => {
			try {
				await loadGoogleMapsFromPublicConfig(api);
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
			placeholder: "Search exact business location",
			onPlaceSelected: (place) => {
				const mapped = mapAutocompletePlaceToLocation(
					place,
					businessLocation.label,
				);
				setBusinessLocation((prev) => ({
					...prev,
					label: mapped.address,
					latitude: mapped.latitude,
					longitude: mapped.longitude,
					placeId: mapped.placeId,
				}));
			},
		});
	}, [mapsReady, businessLocation.label]);

	useEffect(() => {
		if (!mapsReady || !mapPreviewRef.current || !window.google?.maps) {
			return;
		}

		const latitude = Number(businessLocation.latitude);
		const longitude = Number(businessLocation.longitude);
		const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
		const center = hasCoords
			? { lat: latitude, lng: longitude }
			: DEFAULT_PREVIEW_COORDS;

		if (!mapInstanceRef.current) {
			mapInstanceRef.current = new window.google.maps.Map(
				mapPreviewRef.current,
				{
					center,
					zoom: hasCoords ? 15 : 11,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: false,
				},
			);
			mapGeocoderRef.current = new window.google.maps.Geocoder();
		}

		const applyPinnedLocation = (lat, lng) => {
			const geocoder = mapGeocoderRef.current;
			if (!geocoder) {
				setBusinessLocation((prev) => ({
					...prev,
					label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
					latitude: String(lat),
					longitude: String(lng),
					placeId: "",
				}));
				return;
			}

			geocoder.geocode({ location: { lat, lng } }, (results, status) => {
				if (status === "OK" && results?.length) {
					const best = results[0];
					setBusinessLocation((prev) => ({
						...prev,
						label:
							best.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
						latitude: String(lat),
						longitude: String(lng),
						placeId: best.place_id || prev.placeId || "",
					}));
					return;
				}

				setBusinessLocation((prev) => ({
					...prev,
					label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
					latitude: String(lat),
					longitude: String(lng),
					placeId: "",
				}));
			});
		};

		if (!mapListenersBoundRef.current) {
			mapInstanceRef.current.addListener("click", (event) => {
				const lat = event?.latLng?.lat?.();
				const lng = event?.latLng?.lng?.();
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

				const position = { lat, lng };
				if (!mapMarkerRef.current) {
					mapMarkerRef.current = new window.google.maps.Marker({
						position,
						map: mapInstanceRef.current,
						draggable: true,
					});
					mapMarkerRef.current.addListener("dragend", (dragEvent) => {
						const dragLat = dragEvent?.latLng?.lat?.();
						const dragLng = dragEvent?.latLng?.lng?.();
						if (!Number.isFinite(dragLat) || !Number.isFinite(dragLng)) return;
						applyPinnedLocation(dragLat, dragLng);
					});
				} else {
					mapMarkerRef.current.setPosition(position);
				}

				mapInstanceRef.current.setCenter(position);
				mapInstanceRef.current.setZoom(15);
				applyPinnedLocation(lat, lng);
			});
			mapListenersBoundRef.current = true;
		}

		if (hasCoords) {
			const nextPos = { lat: latitude, lng: longitude };
			if (!mapMarkerRef.current) {
				mapMarkerRef.current = new window.google.maps.Marker({
					position: nextPos,
					map: mapInstanceRef.current,
					draggable: true,
				});
				mapMarkerRef.current.addListener("dragend", (dragEvent) => {
					const dragLat = dragEvent?.latLng?.lat?.();
					const dragLng = dragEvent?.latLng?.lng?.();
					if (!Number.isFinite(dragLat) || !Number.isFinite(dragLng)) return;
					applyPinnedLocation(dragLat, dragLng);
				});
			} else {
				mapMarkerRef.current.setPosition(nextPos);
			}
			mapInstanceRef.current.setCenter(nextPos);
			mapInstanceRef.current.setZoom(15);
		}
	}, [mapsReady, businessLocation.latitude, businessLocation.longitude]);

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
				const suggestions = await fetchOpenStreetSuggestions(query, {
					signal: controller.signal,
					limit: 6,
				});
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

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const selectFallbackSuggestion = (suggestion) => {
		setBusinessLocation({
			label: suggestion.label,
			latitude: String(suggestion.lat),
			longitude: String(suggestion.lng),
			placeId: `osm:${suggestion.id}`,
		});
		setFallbackQuery(suggestion.label);
		setFallbackSuggestions([]);
	};

	const selectBusinessCategory = (value) => {
		setFormData((prev) => ({
			...prev,
			category: String(value || "").trim(),
		}));
		setIsCategoryPickerOpen(false);
	};

	const handleImageChange = async (event) => {
		const { name, files } = event.target;
		const selectedFile = files?.[0] || null;

		if (!selectedFile) {
			if (name === "logo") {
				setLogoFile(null);
				setLogoPreview("");
			}
			if (name === "banner") {
				setBannerFile(null);
				setBannerPreview("");
			}
			return;
		}

		if (!String(selectedFile.type || "").startsWith("image/")) {
			toast.error("Please choose a valid image file");
			event.target.value = "";
			return;
		}

		try {
			const compressed = await compressImageFile(selectedFile, {
				maxWidth: name === "banner" ? 1920 : 800,
				maxHeight: name === "banner" ? 1080 : 800,
				quality: 0.82,
			});

			if (name === "logo") setLogoFile(compressed);
			if (name === "logo") {
				setLogoPreview(URL.createObjectURL(compressed));
			}
			if (name === "banner") {
				setBannerFile(compressed);
				setBannerPreview(URL.createObjectURL(compressed));
			}
		} catch {
			toast.error("Unable to process selected image");
			event.target.value = "";
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setShowValidation(true);

		if (!formData.businessName.trim()) {
			return toast.error("Business name is required");
		}
		if (!formData.description.trim()) {
			return toast.error("Business description is required");
		}
		if (!formData.gstOrMsme.trim()) {
			return toast.error("GST/MSME number is required");
		}
		if (!formData.category.trim()) {
			return toast.error("Business category is required");
		}
		if (!logoFile) {
			return toast.error("Business logo is required");
		}
		if (
			!hasValidCoordinates(
				businessLocation.latitude,
				businessLocation.longitude,
			)
		) {
			return toast.error("Please pin/select your exact business location");
		}
		if (!String(businessLocation.label || "").trim()) {
			return toast.error("Business location label is required");
		}
		if (!acceptTerms) {
			return toast.error("Please accept terms and conditions");
		}

		try {
			setSubmitting(true);
			const selectedLocation = String(businessLocation.label || "").trim();
			const businessLocationUrl = createGoogleMapsLink({
				lat: businessLocation.latitude,
				lng: businessLocation.longitude,
				placeId: businessLocation.placeId,
			});
			const payload = new FormData();
			payload.append("businessName", formData.businessName.trim());
			payload.append("description", formData.description.trim());
			payload.append("gstOrMsme", formData.gstOrMsme.trim().toUpperCase());
			payload.append("category", formData.category.trim());
			payload.append("additionalCategory", formData.additionalCategory.trim());
			payload.append("location", selectedLocation || "Not specified");
			payload.append("businessLatitude", String(businessLocation.latitude));
			payload.append("businessLongitude", String(businessLocation.longitude));
			payload.append("businessPlaceId", businessLocation.placeId || "");
			payload.append("businessLocationUrl", businessLocationUrl);
			payload.append("businessLogo", logoFile);

			if (bannerFile) {
				payload.append("businessBanner", bannerFile);
			}

			const { data } = await api.post("/businesses", payload, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			if (user) {
				setCurrentUser({ ...user, accountType: "business" });
			}

			const business = data?.business || {};

			localStorage.setItem(
				"dealpost:business-registration-meta",
				JSON.stringify({
					description: formData.description.trim(),
					primaryCategory: formData.category.trim(),
					additionalCategory: formData.additionalCategory.trim(),
					locationLabel: selectedLocation,
					locationUrl: businessLocationUrl,
					businessName: formData.businessName.trim(),
					logoUrl: String(business?.businessLogo || "").trim(),
					bannerUrl: String(business?.businessBanner || "").trim(),
					savedAt: new Date().toISOString(),
				}),
			);

			const mapKey = "dealpost:business-registration-meta-map";
			let existingMap = {};
			try {
				existingMap = JSON.parse(localStorage.getItem(mapKey) || "{}") || {};
			} catch {
				existingMap = {};
			}

			existingMap[formData.businessName.trim()] = {
				description: formData.description.trim(),
				primaryCategory: formData.category.trim(),
				additionalCategory: formData.additionalCategory.trim(),
				locationLabel: selectedLocation,
				locationUrl: businessLocationUrl,
				logoUrl: String(business?.businessLogo || "").trim(),
				bannerUrl: String(business?.businessBanner || "").trim(),
				savedAt: new Date().toISOString(),
			};

			localStorage.setItem(mapKey, JSON.stringify(existingMap));

			toast.success("Business registration completed");
			navigate("/business-listings");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to complete registration",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const lat = Number(businessLocation.latitude);
	const lng = Number(businessLocation.longitude);
	const previewLat = Number.isFinite(lat) ? lat : DEFAULT_PREVIEW_COORDS.lat;
	const previewLng = Number.isFinite(lng) ? lng : DEFAULT_PREVIEW_COORDS.lng;
	const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${previewLat},${previewLng}`)}&z=${Number.isFinite(lat) && Number.isFinite(lng) ? 15 : 11}&output=embed`;

	return (
		<div className="min-h-screen bg-[#F8F9FA] font-sans text-black flex flex-col">
			<Navbar />

			<main
				id="main-content"
				className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 flex-1"
			>
				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
						Register Your Business
					</h1>
					<p className="mt-2 text-sm text-[#666666]">
						Complete your profile in a few quick steps.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-8">
					<section className="grid gap-4 md:grid-cols-12">
						<article className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm md:col-span-7 lg:col-span-8">
							<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black">
								<ImagePlus size={20} className="text-[#D4B200]" />
								Logo & Brand Name
							</h2>
							<div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
								<div>
									<label
										htmlFor="business-logo"
										className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#666666]"
									>
										Business Logo *
									</label>
									<label
										htmlFor="business-logo"
										className="relative flex h-[180px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#D8D8D8] bg-[#FAFAFA]"
									>
										{logoPreview ? (
											<img
												src={logoPreview}
												alt="Business logo preview"
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="grid place-items-center gap-2 text-[#777777]">
												<ImagePlus size={20} />
												<span className="text-xs font-semibold">
													Upload logo
												</span>
											</div>
										)}
									</label>
									<input
										id="business-logo"
										type="file"
										name="logo"
										accept="image/png,image/jpeg,image/webp,image/gif"
										onChange={handleImageChange}
										className="sr-only"
									/>
									<p className="mt-2 text-xs text-[#7A7A7A]">
										Required. Used as your business profile logo.
									</p>
									{showValidation && !logoFile ? (
										<p
											className="mt-1 text-xs font-medium text-red-600"
											role="alert"
										>
											Business logo is required
										</p>
									) : null}
								</div>
								<div className="space-y-4">
									<FormField
										id="business-name"
										name="businessName"
										label="Business Name"
										required
										value={formData.businessName}
										onChange={handleChange}
										placeholder="e.g. Sharma Electronics"
										error={
											showValidation && !formData.businessName.trim()
												? "Business name is required"
												: ""
										}
									/>
									<FormField
										id="business-gst-msme"
										name="gstOrMsme"
										label="GST/MSME No"
										required
										value={formData.gstOrMsme}
										onChange={handleChange}
										placeholder="Enter GSTIN or MSME number"
										error={
											showValidation && !formData.gstOrMsme.trim()
												? "GST/MSME number is required"
												: ""
										}
									/>
								</div>
							</div>
						</article>

						<article className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm md:col-span-5 lg:col-span-4">
							<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black">
								<Building2 size={20} className="text-[#D4B200]" />
								Banner (Optional)
							</h2>
							<label
								htmlFor="business-banner"
								className="relative flex h-[180px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#D8D8D8] bg-[#FAFAFA]"
							>
								{bannerPreview ? (
									<img
										src={bannerPreview}
										alt="Business banner preview"
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="grid place-items-center gap-2 text-[#777777]">
										<ImagePlus size={20} />
										<span className="text-xs font-semibold">Upload banner</span>
									</div>
								)}
							</label>
							<input
								id="business-banner"
								type="file"
								name="banner"
								accept="image/png,image/jpeg,image/webp,image/gif"
								onChange={handleImageChange}
								className="sr-only"
							/>
							<p className="mt-3 text-xs text-[#7A7A7A] leading-relaxed">
								Recommended ratio 16:9. Ideal resolution 1920 x 1080 px (minimum
								1280 x 720 px).
							</p>
						</article>

						<article className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm md:col-span-7 lg:col-span-8">
							<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black">
								<FileText size={20} className="text-[#D4B200]" />
								Business Details
							</h2>
							<div className="space-y-5">
								<FormField
									id="business-description"
									as="textarea"
									name="description"
									label="Business Description"
									required
									rows={4}
									value={formData.description}
									onChange={handleChange}
									placeholder="Briefly describe your business and services"
									error={
										showValidation && !formData.description.trim()
											? "Business description is required"
											: ""
									}
								/>

								<div>
									<label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#666666]">
										Business Location *
									</label>
									<div className="rounded-2xl border border-[#E0E0E0] bg-white p-2">
										{mapsReady ? (
											<div ref={autocompleteContainerRef} className="w-full" />
										) : (
											<div className="space-y-2 px-1 py-1">
												<input
													value={fallbackQuery}
													onChange={(event) => {
														setFallbackQuery(event.target.value);
														setBusinessLocation((prev) => ({
															...prev,
															label: event.target.value,
															latitude: "",
															longitude: "",
															placeId: "",
														}));
													}}
													placeholder="Search exact business location"
													className="h-12 w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 text-sm outline-none"
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
									{businessLocation.label ? (
										<p className="mt-2 rounded-xl bg-[#FAFAFA] px-3 py-2 text-sm text-[#333333]">
											Selected: {businessLocation.label}
										</p>
									) : null}
									<div className="mt-2 overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white">
										{mapsReady ? (
											<div ref={mapPreviewRef} className="h-56 w-full" />
										) : mapEmbedUrl ? (
											<iframe
												title="Selected business location preview"
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
										Search the exact business location, then click on map to
										fine-tune the pin.
									</p>
									{showValidation &&
									!hasValidCoordinates(
										businessLocation.latitude,
										businessLocation.longitude,
									) ? (
										<p
											className="mt-2 text-xs font-medium text-red-600"
											role="alert"
										>
											Exact business location is required
										</p>
									) : null}
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#666666]">
											Business Category *
										</label>
										<div className="relative" ref={categoryPickerRef}>
											<button
												type="button"
												onClick={() => setIsCategoryPickerOpen((prev) => !prev)}
												className="flex h-12 w-full items-center justify-between rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 text-left text-[0.95rem] text-black outline-none focus:ring-2 focus:ring-[#FFD600]/50"
												aria-haspopup="listbox"
												aria-expanded={isCategoryPickerOpen}
											>
												<span
													className={formData.category ? "" : "text-[#888888]"}
												>
													{formData.category || "Select category"}
												</span>
												<ChevronDown
													size={16}
													className={`transition ${isCategoryPickerOpen ? "rotate-180" : ""}`}
												/>
											</button>

											{isCategoryPickerOpen ? (
												<div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-96 overflow-y-auto rounded-2xl border border-[#E3E3E3] bg-white p-3 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
													{categorySections.length ? (
														<div className="space-y-2" role="listbox">
															{categorySections.map((section) => (
																<div
																	key={section.title}
																	className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] p-2"
																>
																	<button
																		type="button"
																		onClick={() =>
																			selectBusinessCategory(section.title)
																		}
																		className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-sm font-bold text-[#1A1A1A] hover:bg-white"
																	>
																		<span className="line-clamp-1">
																			{section.title}
																		</span>
																		{formData.category === section.title ? (
																			<Check
																				size={14}
																				className="text-[#1677ff]"
																			/>
																		) : null}
																	</button>
																	<div className="space-y-1">
																		{section.groups.map((group) => (
																			<details
																				key={`${section.title}-${group.label}`}
																				className="rounded-lg border border-[#E3E3E3] bg-white px-2 py-1"
																			>
																				<summary className="cursor-pointer list-none text-xs font-semibold text-[#555555]">
																					<div className="flex items-center justify-between gap-2">
																						<span className="line-clamp-1">
																							{group.label}
																						</span>
																						<span className="text-[10px] text-[#777777]">
																							{group.items.length || 1}
																						</span>
																					</div>
																				</summary>
																				<div className="mt-1 space-y-1 pl-1">
																					{group.items.length ? (
																						group.items
																							.slice(0, 8)
																							.map((itemLabel) => {
																								const fullValue = `${section.title} > ${group.label} > ${itemLabel}`;
																								return (
																									<button
																										key={fullValue}
																										type="button"
																										onClick={() =>
																											selectBusinessCategory(
																												fullValue,
																											)
																										}
																										className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs text-[#5C5C5C] hover:bg-[#F6F6F6]"
																									>
																										<span className="line-clamp-1">
																											{itemLabel}
																										</span>
																										{formData.category ===
																										fullValue ? (
																											<Check
																												size={13}
																												className="text-[#1677ff]"
																											/>
																										) : null}
																									</button>
																								);
																							})
																					) : (
																						<button
																							type="button"
																							onClick={() =>
																								selectBusinessCategory(
																									`${section.title} > ${group.label}`,
																								)
																							}
																							className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs text-[#5C5C5C] hover:bg-[#F6F6F6]"
																						>
																							<span className="line-clamp-1">
																								Browse {group.label}
																							</span>
																						</button>
																					)}
																				</div>
																			</details>
																		))}
																	</div>
																</div>
															))}
														</div>
													) : (
														<p className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] p-3 text-xs text-[#666666]">
															No categories available right now.
														</p>
													)}
												</div>
											) : null}
										</div>
										{formData.category ? (
											<p className="mt-2 text-xs text-[#7A7A7A]">
												Selected: {formData.category}
											</p>
										) : null}
										{showValidation && !formData.category.trim() ? (
											<p
												className="mt-2 text-xs font-medium text-red-600"
												role="alert"
											>
												Business category is required
											</p>
										) : null}
									</div>
									<FormField
										id="business-additional-category"
										name="additionalCategory"
										label="Add More Category"
										value={formData.additionalCategory}
										onChange={handleChange}
										placeholder="Optional additional category"
										hint="Use this to add one more business category."
									/>
								</div>
							</div>
						</article>

						<article className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm md:col-span-5 lg:col-span-4">
							<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black">
								<Shield size={20} className="text-[#D4B200]" />
								Trust & Terms
							</h2>
							<div className="space-y-2 text-sm text-[#444444]">
								<div className="flex items-start gap-2">
									<ShieldCheck size={16} className="mt-0.5 text-green-600" />
									<p>
										Your core business details are used for trusted
										verification.
									</p>
								</div>
								<div className="flex items-start gap-2">
									<Tags size={16} className="mt-0.5 text-[#B79200]" />
									<p>Business listing is free forever.</p>
								</div>
							</div>
							<label className="mt-4 flex items-start gap-3 rounded-xl border border-[#E7E7E7] bg-[#FBFBFB] p-3">
								<input
									type="checkbox"
									checked={acceptTerms}
									onChange={(event) => setAcceptTerms(event.target.checked)}
									className="mt-1 h-4 w-4 rounded border-[#CFCFCF]"
								/>
								<span className="text-xs text-[#555555] leading-relaxed">
									I accept the{" "}
									<Link
										to="/legal/terms-and-conditions"
										className="font-semibold text-[#8b7008] hover:underline"
										target="_blank"
										rel="noreferrer"
									>
										Terms & Conditions
									</Link>{" "}
									and confirm the details are accurate.
								</span>
							</label>
							{showValidation && !acceptTerms ? (
								<p
									className="mt-2 text-xs font-medium text-red-600"
									role="alert"
								>
									Please accept terms and conditions
								</p>
							) : null}
						</article>
					</section>

					<div className="flex items-center justify-end">
						<Button
							type="submit"
							disabled={submitting}
							isLoading={submitting}
							size="lg"
							className="rounded-full px-8"
						>
							{submitting ? "Registering..." : "Complete Registration"}
						</Button>
					</div>
				</form>
			</main>

			<Footer />
		</div>
	);
}
