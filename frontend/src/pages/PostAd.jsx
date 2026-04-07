import { ImagePlus, MapPin, Rocket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/useAuth";
import { compressImageFile } from "../utils/imageCompressor";
import { mountPlaceAutocompleteElement } from "../utils/googleMaps";
import { pickArray } from "../utils/api";
import {
	fetchOpenStreetSuggestions,
	hasValidCoordinates,
	loadGoogleMapsFromPublicConfig,
	mapAutocompletePlaceToLocation,
} from "../utils/locationHelpers";

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
		match: "Electronics > TV & Home Appliances",
		fields: [
			"Brand",
			"Model",
			"Type",
			"Capacity",
			"Power",
			"Energy Rating",
			"Age",
			"Condition",
		],
	},
	{
		match: "Electronics > Audio-Visual (AV) Equipment",
		fields: [
			"Brand",
			"Model",
			"Type",
			"Resolution/Output",
			"Connectivity",
			"Accessories Included",
			"Usage",
			"Condition",
		],
	},
	{
		match: "Fashion & Beauty",
		fields: [
			"Brand",
			"Category",
			"Size",
			"Color",
			"Material",
			"Condition",
			"Authenticity",
		],
	},
	{
		match: "Sports",
		fields: [
			"Brand",
			"Type",
			"Sport",
			"Size",
			"Material",
			"Usage",
			"Condition",
		],
	},
	{
		match: "Pet Supplies",
		fields: [
			"Category",
			"Pet Type",
			"Brand",
			"Age/Stage",
			"Quantity",
			"Expiry",
			"Condition",
		],
	},
	{
		match: "Food & Drinks",
		fields: [
			"Category",
			"Brand/Outlet",
			"Net Quantity",
			"Package Type",
			"Expiry Date",
			"Delivery/Pickup",
		],
	},
	{
		match: "Health & Wellness",
		fields: [
			"Category",
			"Brand",
			"Usage",
			"Package Size",
			"Expiry Date",
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
	{
		match: "Property",
		fields: [
			"Property Type",
			"Size",
			"Bedrooms",
			"Bathrooms",
			"Furnishing",
			"Parking",
			"Availability",
		],
	},
	{
		match: "Hospitals & Clinics",
		fields: [
			"Service Type",
			"Specialization",
			"Location",
			"Consultation Type",
			"Timings",
			"Experience",
		],
	},
	{
		match: "Services",
		fields: [
			"Service Type",
			"Coverage Area",
			"Availability",
			"Experience",
			"Turnaround Time",
			"Pricing Model",
		],
	},
	{
		match: "Funeral Services",
		fields: [
			"Service Type",
			"Coverage Area",
			"Availability",
			"Response Time",
			"Contact Person",
		],
	},
	{
		match: "Miscellaneous / Other (Extracted from middle/back)",
		fields: [
			"Category",
			"Brand/Provider",
			"Type",
			"Size/Capacity",
			"Usage",
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

export default function PostAd({ variant = "personal" }) {
	const navigate = useNavigate();
	const { user, setCurrentUser } = useAuth();
	const isBusinessFlow = variant === "business";
	const pageTitle = isBusinessFlow
		? "Register Business Listing"
		: "Start Listing";
	const pageSubtitle = isBusinessFlow
		? "Launch your storefront inventory with verified business details."
		: "Transform your items into opportunities.";
	const submitLabel = isBusinessFlow ? "Post Business Deal" : "Post Deal";
	const premiumTitle = isBusinessFlow ? "Boost Business Reach?" : "Go Premium?";
	const premiumDescription = isBusinessFlow
		? "Highlight your business listing in local search and category feeds for 7 days."
		: "Boost your ad to top of Trending for 7 days.";
	const [submitting, setSubmitting] = useState(false);
	const [categories, setCategories] = useState([]);
	const [files, setFiles] = useState([null, null, null]);
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
		gstOrMsme: "",
		verifiedBusinessName: "",
		verifiedBusinessAddress: "",
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
		premiumBoost: false,
	});

	const needsBusinessVerification = useMemo(() => {
		if (!isBusinessFlow) return false;
		const role = String(user?.accountType || "").toLowerCase();
		const missingBusinessName = !String(user?.businessName || "").trim();
		const missingGst = !String(user?.gstOrMsme || "").trim();
		const missingAddress = !String(user?.location || "").trim();
		return (
			role !== "business" || missingBusinessName || missingGst || missingAddress
		);
	}, [
		isBusinessFlow,
		user?.accountType,
		user?.businessName,
		user?.gstOrMsme,
		user?.location,
	]);

	useEffect(() => {
		if (!isBusinessFlow) return;
		setForm((prev) => ({
			...prev,
			gstOrMsme: prev.gstOrMsme || user?.gstOrMsme || "",
			verifiedBusinessName:
				prev.verifiedBusinessName || user?.businessName || "",
			verifiedBusinessAddress:
				prev.verifiedBusinessAddress || user?.location || "",
		}));
	}, [isBusinessFlow, user?.businessName, user?.gstOrMsme, user?.location]);

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
			placeholder: "Search and pick a real address...",
			onPlaceSelected: (place) => {
				const mapped = mapAutocompletePlaceToLocation(place, form.address);
				setForm((prev) => ({
					...prev,
					address: mapped.address,
					latitude: mapped.latitude,
					longitude: mapped.longitude,
					placeId: mapped.placeId,
				}));
			},
		});
	}, [mapsReady, form.address]);

	useEffect(() => {
		if (!mapsReady || !mapPreviewRef.current || !window.google?.maps) {
			return;
		}

		const latitude = Number(form.latitude);
		const longitude = Number(form.longitude);
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
				setForm((prev) => ({
					...prev,
					address: prev.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
					latitude: String(lat),
					longitude: String(lng),
					placeId: prev.placeId || "",
				}));
				return;
			}

			geocoder.geocode({ location: { lat, lng } }, (results, status) => {
				if (status === "OK" && results?.length) {
					const best = results[0];
					setForm((prev) => ({
						...prev,
						address:
							best.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
						latitude: String(lat),
						longitude: String(lng),
						placeId: best.place_id || "",
					}));
					return;
				}

				setForm((prev) => ({
					...prev,
					address: prev.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
					latitude: String(lat),
					longitude: String(lng),
					placeId: prev.placeId || "",
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
	}, [mapsReady, form.latitude, form.longitude]);

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

	useEffect(() => {
		setCuratedSpecs((prev) => {
			const next = {};
			for (const field of curatedSpecFields) {
				next[field] = prev[field] || "";
			}
			return next;
		});
	}, [curatedSpecFields]);

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
			if (new Date(form.auctionEndsAt).getTime() <= Date.now()) {
				return toast.error("Auction end date/time must be in the future");
			}
		} else if (!form.price || Number(form.price) <= 0) {
			return toast.error("Please add a valid price");
		}
		const hasCuratedSpecs = Object.values(curatedSpecs).some((value) =>
			String(value || "").trim(),
		);
		const hasAdditionalSpecs = String(form.specifications || "").trim();
		if (!hasCuratedSpecs && !hasAdditionalSpecs) {
			return toast.error("Please add at least one specification");
		}
		if (!form.description.trim()) return toast.error("Description is required");
		if (isBusinessFlow && !form.gstOrMsme.trim()) {
			return toast.error("GST/MSME number is required for business listing");
		}
		if (isBusinessFlow && !form.verifiedBusinessName.trim()) {
			return toast.error("Verified business name is required");
		}
		if (isBusinessFlow && !form.verifiedBusinessAddress.trim()) {
			return toast.error("Verified business address is required");
		}
		if (!form.address.trim()) return toast.error("Pickup location is required");
		if (!hasValidCoordinates(form.latitude, form.longitude)) {
			return toast.error(
				"Please choose a valid location from suggestions or pin it on map",
			);
		}
		if (!files[0]) return toast.error("Please add a hero image");

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

			if (isBusinessFlow) {
				const businessProfilePayload = {
					accountType: "business",
					gstOrMsme: form.gstOrMsme.trim(),
					businessName: form.verifiedBusinessName.trim(),
					location: form.verifiedBusinessAddress.trim(),
				};

				const { data: profileData } = await api.put(
					"/users/me",
					businessProfilePayload,
				);
				if (profileData?.user) {
					setCurrentUser(profileData.user);
				}
			}

			const selectedFiles = files.filter(Boolean);
			const uploadedImages = await Promise.all(
				selectedFiles.map((file) => uploadCompressedImageToR2(file)),
			);

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
				...(isBusinessFlow && form.gstOrMsme.trim()
					? { gstOrMsme: form.gstOrMsme.trim() }
					: {}),
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

	const lat = Number(form.latitude);
	const lng = Number(form.longitude);
	const previewLat = Number.isFinite(lat) ? lat : DEFAULT_PREVIEW_COORDS.lat;
	const previewLng = Number.isFinite(lng) ? lng : DEFAULT_PREVIEW_COORDS.lng;
	const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${previewLat},${previewLng}`)}&z=${Number.isFinite(lat) && Number.isFinite(lng) ? 15 : 11}&output=embed`;

	return (
		<div className="min-h-screen bg-brand-bg flex flex-col">
			<Navbar />

			<main id="main-content" className="container-shell py-6 flex-1">
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
								<FormField
									id="postad-title"
									name="title"
									label="Ad Title"
									required
									value={form.title}
									onChange={(event) =>
										setForm((prev) => ({ ...prev, title: event.target.value }))
									}
									placeholder="Ad title"
									inputClassName="input-shell bg-brand-bg"
								/>
								{isBusinessFlow ? (
									<div className="space-y-3 rounded-2xl border border-[#E7D89F] bg-[#FFF9E5] p-4">
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B7322]">
											Business Verification
										</p>
										{needsBusinessVerification ? (
											<p className="text-xs text-[#7B6A26]">
												Complete this once for your first business listing.
											</p>
										) : (
											<p className="text-xs text-[#7B6A26]">
												Your verified business profile will be used for this
												listing.
											</p>
										)}

										<FormField
											id="postad-gst"
											name="gstOrMsme"
											label="GST / MSME Number"
											value={form.gstOrMsme}
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													gstOrMsme: event.target.value,
												}))
											}
											placeholder="GST / MSME Number"
											inputClassName="input-shell bg-brand-bg"
										/>
										<FormField
											id="postad-business-name"
											name="verifiedBusinessName"
											label="Verified Business Name"
											required
											value={form.verifiedBusinessName}
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													verifiedBusinessName: event.target.value,
												}))
											}
											placeholder="Verified Business Name"
											inputClassName="input-shell bg-brand-bg"
										/>
										<FormField
											id="postad-business-address"
											name="verifiedBusinessAddress"
											label="Verified Business Address"
											required
											value={form.verifiedBusinessAddress}
											onChange={(event) =>
												setForm((prev) => ({
													...prev,
													verifiedBusinessAddress: event.target.value,
												}))
											}
											placeholder="Verified Business Address"
											inputClassName="input-shell bg-brand-bg"
										/>
									</div>
								) : null}
								<div className="grid gap-3 sm:grid-cols-3">
									<FormField
										id="postad-listing-type"
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
										<option value="fixed">Price Mode</option>
										<option value="auction">Auction</option>
									</FormField>

									<FormField
										id="postad-parent-category"
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
										id="postad-sub-category"
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
												id="postad-starting-bid"
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
												id="postad-auction-end"
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
											id="postad-price"
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
									id="postad-description"
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
										Curated Specifications
									</p>
									<p className="mt-1 text-xs text-[#7B6A26]">
										Auto-suggested fields based on category. Fill what applies.
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
									</div>
								</div>

								<FormField
									id="postad-specifications"
									as="textarea"
									name="specifications"
									label="Additional Custom Specs"
									value={form.specifications}
									onChange={(event) =>
										setForm((prev) => ({
											...prev,
											specifications: event.target.value,
										}))
									}
									placeholder="Additional custom specs (optional, one per line):&#10;Battery Replaced: No&#10;Invoice Available: Yes"
									inputClassName="min-h-28 bg-brand-bg"
								/>

								<FormField
									id="postad-additional-notes"
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
								{submitting ? "Publishing..." : submitLabel}
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
									<div ref={autocompleteContainerRef} className="w-full" />
								) : (
									<div className="space-y-2 px-1 py-1">
										<input
											value={fallbackQuery}
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
										{mapsFailed ? (
											<p className="px-1 text-xs text-brand-muted"></p>
										) : null}
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
								{mapsReady ? (
									<div ref={mapPreviewRef} className="h-56 w-full" />
								) : mapEmbedUrl ? (
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
							<p className="mt-2 text-xs text-brand-muted">
								Click anywhere on map to pin pickup location. You can drag the
								pin to fine-tune.
							</p>
						</article>

						<article className="rounded-3xl bg-[#2b2b2b] p-5 text-white">
							<h3 className="text-2xl font-display font-bold">
								{premiumTitle}
							</h3>
							<p className="mt-1 text-sm text-white/70">{premiumDescription}</p>

							<label className="mt-4 flex items-center justify-between rounded-xl border border-white/20 bg-white/5 p-3">
								<span className="inline-flex items-center gap-2 text-sm">
									<Rocket size={14} className="text-brand-yellow" /> DealPost
									Boost
								</span>
								<span className="font-mono text-brand-yellow">+ ₹599</span>
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
			</main>
			<Footer />
		</div>
	);
}
