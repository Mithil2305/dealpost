import {
	AlertTriangle,
	BadgeCheck,
	Building2,
	Check,
	ChevronDown,
	FileText,
	ImagePlus,
	KeyRound,
	LayoutDashboard,
	Mail,
	MapPin,
	Megaphone,
	PlusCircle,
	Save,
	ShieldOff,
	Shield,
	ShieldCheck,
	ShoppingBag,
	Star,
	Tags,
	Trash2,
	UserRoundCog,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Profile from "./Profile.jsx";
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
import {
	createSponsoredAd,
	deleteSponsoredAd,
	getMySponsoredAds,
	updateSponsoredAd,
} from "../utils/sponsoredAds";

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

export default function UserDashboard() {
	const { user, logout, setCurrentUser } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [activeTab, setActiveTab] = useState("overview");
	const [busyAction, setBusyAction] = useState("");
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
	});
	const [businessForm, setBusinessForm] = useState({
		businessName: "",
		gstOrMsme: "",
		description: "",
		category: "",
		additionalCategory: "",
	});
	const [categories, setCategories] = useState([]);
	const [showBusinessValidation, setShowBusinessValidation] = useState(false);
	const [acceptBusinessTerms, setAcceptBusinessTerms] = useState(false);
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
	const [logoFile, setLogoFile] = useState(null);
	const [bannerFile, setBannerFile] = useState(null);
	const [logoPreview, setLogoPreview] = useState("");
	const [bannerPreview, setBannerPreview] = useState("");
	const categoryPickerRef = useRef(null);
	const autocompleteContainerRef = useRef(null);
	const mapPreviewRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const mapMarkerRef = useRef(null);
	const mapGeocoderRef = useRef(null);
	const mapListenersBoundRef = useRef(false);
	const [dashboardLoading, setDashboardLoading] = useState(true);
	const [myListings, setMyListings] = useState([]);
	const [likedListings, setLikedListings] = useState([]);
	const [messageCount, setMessageCount] = useState(0);
	const [mySponsoredAds, setMySponsoredAds] = useState([]);
	const [sponsoredForm, setSponsoredForm] = useState({
		title: "",
		description: "",
		imageUrl: "",
		targetUrl: "",
		placement: "any",
		isActive: true,
	});
	const [editingSponsoredId, setEditingSponsoredId] = useState(null);
	const hasBusinessAccount =
		String(user?.accountType || "").toLowerCase() === "business";

	const getStoredBusinessMeta = useCallback(() => {
		const key = String(user?.businessName || "")
			.trim()
			.toLowerCase();
		if (!key) return {};

		try {
			const mapRaw =
				JSON.parse(
					localStorage.getItem("dealpost:business-registration-meta-map") ||
						"{}",
				) || {};
			const direct = mapRaw[String(user?.businessName || "").trim()] || null;
			if (direct && typeof direct === "object") return direct;

			for (const [name, meta] of Object.entries(mapRaw)) {
				if (String(name).trim().toLowerCase() === key) {
					return meta || {};
				}
			}
		} catch {
			// no-op
		}

		return {};
	}, [user?.businessName]);

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
		const requestedTab = new URLSearchParams(location.search)
			.get("tab")
			?.toLowerCase();
		const allowedTabs = new Set([
			"overview",
			"profile",
			"security",
			"business",
			"sponsored",
		]);
		if (requestedTab && allowedTabs.has(requestedTab)) {
			setActiveTab(requestedTab);
		}
	}, [location.search]);

	useEffect(() => {
		const meta = getStoredBusinessMeta();
		const locationLabel = String(
			user?.location || meta?.locationLabel || "",
		).trim();
		const latitude = String(user?.businessLatitude || "").trim();
		const longitude = String(user?.businessLongitude || "").trim();
		const placeId = String(user?.businessPlaceId || "").trim();
		setBusinessForm({
			businessName: String(user?.businessName || "").trim(),
			gstOrMsme: String(user?.gstOrMsme || "").trim(),
			description: String(meta?.description || "").trim(),
			category: String(meta?.primaryCategory || "").trim(),
			additionalCategory: String(meta?.additionalCategory || "").trim(),
		});
		setBusinessLocation({
			label: locationLabel,
			latitude,
			longitude,
			placeId,
		});
		setFallbackQuery(locationLabel);
		setAcceptBusinessTerms(false);
		setShowBusinessValidation(false);
		setLogoFile(null);
		setBannerFile(null);
		setLogoPreview(String(user?.avatar || meta?.logoUrl || "").trim());
		setBannerPreview(
			String(user?.businessBanner || meta?.bannerUrl || "").trim(),
		);
	}, [
		getStoredBusinessMeta,
		user?.avatar,
		user?.businessBanner,
		user?.businessLatitude,
		user?.businessLongitude,
		user?.businessPlaceId,
		user?.businessName,
		user?.gstOrMsme,
		user?.location,
	]);

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

	useEffect(() => {
		return () => {
			if (logoFile && logoPreview?.startsWith("blob:")) {
				URL.revokeObjectURL(logoPreview);
			}
			if (bannerFile && bannerPreview?.startsWith("blob:")) {
				URL.revokeObjectURL(bannerPreview);
			}
		};
	}, [logoFile, logoPreview, bannerFile, bannerPreview]);

	useEffect(() => {
		let active = true;

		const fetchDashboardData = async () => {
			try {
				setDashboardLoading(true);
				const [listingRes, convoRes, likedRes, sponsored] = await Promise.all([
					api.get("/listings", { params: { userId: "me", limit: 40 } }),
					api
						.get("/conversations")
						.catch(() => ({ data: { conversations: [] } })),
					api
						.get("/listings/liked/my")
						.catch(() => ({ data: { listings: [] } })),
					getMySponsoredAds().catch(() => []),
				]);

				if (!active) return;

				const ownListings = Array.isArray(listingRes?.data?.listings)
					? listingRes.data.listings
					: [];
				const conversations = Array.isArray(convoRes?.data?.conversations)
					? convoRes.data.conversations
					: [];
				const liked = Array.isArray(likedRes?.data?.listings)
					? likedRes.data.listings
					: [];

				setMyListings(ownListings);
				setMessageCount(conversations.length);
				setLikedListings(liked);
				setMySponsoredAds(Array.isArray(sponsored) ? sponsored : []);
			} catch {
				if (!active) return;
				toast.error("Unable to load dashboard data");
			} finally {
				if (active) {
					setDashboardLoading(false);
				}
			}
		};

		fetchDashboardData();

		return () => {
			active = false;
		};
	}, []);

	const listingStats = useMemo(() => {
		const initial = {
			total: myListings.length,
			active: 0,
			sold: 0,
			pending: 0,
		};

		for (const listing of myListings) {
			const status = String(listing?.status || "active").toLowerCase();
			if (status === "sold") initial.sold += 1;
			else if (status === "pending") initial.pending += 1;
			else initial.active += 1;
		}

		return initial;
	}, [myListings]);

	const recentListings = useMemo(() => myListings.slice(0, 4), [myListings]);

	const updatePassword = async (event) => {
		event.preventDefault();
		if (!passwordForm.currentPassword || !passwordForm.newPassword) {
			toast.error("Both password fields are required");
			return;
		}

		try {
			setBusyAction("password");
			await api.put("/users/me/password", passwordForm);
			setPasswordForm({ currentPassword: "", newPassword: "" });
			toast.success("Password updated");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to update password",
			);
		} finally {
			setBusyAction("");
		}
	};

	const deactivateAccount = async () => {
		if (
			!window.confirm(
				"Deactivate account? You can contact support to reactivate.",
			)
		) {
			return;
		}

		try {
			setBusyAction("deactivate");
			await api.patch("/users/me/deactivate");
			logout();
			toast.success("Your account has been deactivated");
			navigate("/login");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to deactivate account",
			);
		} finally {
			setBusyAction("");
		}
	};

	const removeAccount = async () => {
		if (!window.confirm("Remove account permanently? This cannot be undone.")) {
			return;
		}

		try {
			setBusyAction("remove");
			await api.delete("/users/me");
			logout();
			toast.success("Account removed successfully");
			navigate("/signup");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to remove account");
		} finally {
			setBusyAction("");
		}
	};

	const resetSponsoredForm = () => {
		setSponsoredForm({
			title: "",
			description: "",
			imageUrl: "",
			targetUrl: "",
			placement: "any",
			isActive: true,
		});
		setEditingSponsoredId(null);
	};

	const saveSponsored = async (event) => {
		event.preventDefault();
		if (sponsoredForm.title.trim().length < 3) {
			toast.error("Ad title must be at least 3 characters");
			return;
		}
		if (!sponsoredForm.imageUrl.trim()) {
			toast.error("Image URL is required");
			return;
		}

		try {
			setBusyAction("sponsored-save");
			if (editingSponsoredId) {
				await updateSponsoredAd(editingSponsoredId, sponsoredForm);
				toast.success("Sponsored ad updated and sent for re-approval");
			} else {
				await createSponsoredAd(sponsoredForm);
				toast.success("Sponsored ad submitted for admin approval");
			}
			setMySponsoredAds(await getMySponsoredAds());
			resetSponsoredForm();
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to save sponsored ad",
			);
		} finally {
			setBusyAction("");
		}
	};

	const startSponsoredEdit = (ad) => {
		setEditingSponsoredId(ad?.id || null);
		setSponsoredForm({
			title: ad?.title || "",
			description: ad?.description || "",
			imageUrl: ad?.imageUrl || "",
			targetUrl: ad?.targetUrl || "",
			placement: ad?.placement || "any",
			isActive: Boolean(ad?.isActive),
		});
	};

	const removeSponsored = async (id) => {
		if (!id) return;
		try {
			setBusyAction(`sponsored-delete-${id}`);
			await deleteSponsoredAd(id);
			setMySponsoredAds(await getMySponsoredAds());
			toast.success("Sponsored ad removed");
		} catch {
			toast.error("Unable to remove sponsored ad");
		} finally {
			setBusyAction("");
		}
	};

	const handleBusinessChange = (event) => {
		const { name, value } = event.target;
		setBusinessForm((prev) => ({ ...prev, [name]: value }));
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
		setBusinessForm((prev) => ({
			...prev,
			category: String(value || "").trim(),
		}));
		setIsCategoryPickerOpen(false);
	};

	const handleBusinessImageChange = async (event) => {
		const { name, files } = event.target;
		const selectedFile = files?.[0] || null;

		if (!selectedFile) return;

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

			if (name === "logo") {
				if (logoFile && logoPreview?.startsWith("blob:")) {
					URL.revokeObjectURL(logoPreview);
				}
				setLogoFile(compressed);
				setLogoPreview(URL.createObjectURL(compressed));
			}

			if (name === "banner") {
				if (bannerFile && bannerPreview?.startsWith("blob:")) {
					URL.revokeObjectURL(bannerPreview);
				}
				setBannerFile(compressed);
				setBannerPreview(URL.createObjectURL(compressed));
			}
		} catch {
			toast.error("Unable to process selected image");
		}

		event.target.value = "";
	};

	const saveBusinessInfo = async (event) => {
		event.preventDefault();
		if (!hasBusinessAccount) return;
		setShowBusinessValidation(true);

		if (businessForm.businessName.trim().length < 2) {
			toast.error("Business name must be at least 2 characters");
			return;
		}
		if (!businessForm.description.trim()) {
			toast.error("Business description is required");
			return;
		}
		if (!businessForm.gstOrMsme.trim()) {
			toast.error("GST/MSME number is required");
			return;
		}
		if (!businessForm.category.trim()) {
			toast.error("Business category is required");
			return;
		}
		if (
			!hasValidCoordinates(
				businessLocation.latitude,
				businessLocation.longitude,
			)
		) {
			toast.error("Please pin/select your exact business location");
			return;
		}
		if (!String(businessLocation.label || "").trim()) {
			toast.error("Business location label is required");
			return;
		}
		if (!acceptBusinessTerms) {
			toast.error("Please accept terms and conditions");
			return;
		}

		try {
			setBusyAction("business-save");
			const selectedLocation = String(businessLocation.label || "").trim();
			const businessLocationUrl = createGoogleMapsLink({
				lat: businessLocation.latitude,
				lng: businessLocation.longitude,
				placeId: businessLocation.placeId,
			});

			const payload = new FormData();
			payload.append("accountType", "business");
			payload.append("businessName", businessForm.businessName.trim());
			payload.append("gstOrMsme", businessForm.gstOrMsme.trim().toUpperCase());
			payload.append("location", selectedLocation || "Not specified");
			payload.append("businessLatitude", String(businessLocation.latitude));
			payload.append("businessLongitude", String(businessLocation.longitude));
			payload.append("businessPlaceId", String(businessLocation.placeId || ""));
			payload.append("businessLocationUrl", businessLocationUrl);

			if (logoFile) {
				payload.append("avatar", logoFile);
			}

			if (bannerFile) {
				payload.append("businessBanner", bannerFile);
			}

			const { data } = await api.put("/users/me", payload, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			if (data?.user) {
				setCurrentUser(data.user);
			}

			const mapKey = "dealpost:business-registration-meta-map";
			let mapRaw = {};
			try {
				mapRaw = JSON.parse(localStorage.getItem(mapKey) || "{}") || {};
			} catch {
				mapRaw = {};
			}

			mapRaw[businessForm.businessName.trim()] = {
				description: businessForm.description.trim(),
				primaryCategory: businessForm.category.trim(),
				additionalCategory: businessForm.additionalCategory.trim(),
				locationLabel: selectedLocation,
				locationUrl: businessLocationUrl,
				logoUrl: String(data?.user?.avatar || "").trim(),
				bannerUrl: String(data?.user?.businessBanner || "").trim(),
				savedAt: new Date().toISOString(),
			};

			localStorage.setItem(mapKey, JSON.stringify(mapRaw));
			localStorage.setItem(
				"dealpost:business-registration-meta",
				JSON.stringify({
					description: businessForm.description.trim(),
					primaryCategory: businessForm.category.trim(),
					additionalCategory: businessForm.additionalCategory.trim(),
					businessName: businessForm.businessName.trim(),
					locationLabel: selectedLocation,
					locationUrl: businessLocationUrl,
					logoUrl: String(data?.user?.avatar || "").trim(),
					bannerUrl: String(data?.user?.businessBanner || "").trim(),
					savedAt: new Date().toISOString(),
				}),
			);

			toast.success("Business info updated");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to update business info",
			);
		} finally {
			setBusyAction("");
		}
	};

	const removeBusinessInfo = async () => {
		if (!hasBusinessAccount) return;
		if (
			!window.confirm(
				"Remove your business profile and switch to personal account?",
			)
		) {
			return;
		}

		try {
			setBusyAction("business-delete");
			const { data } = await api.put("/users/me", {
				accountType: "personal",
				businessName: "",
				gstOrMsme: "",
				businessLocationUrl: "",
				businessLatitude: "",
				businessLongitude: "",
				businessPlaceId: "",
			});

			if (data?.user) {
				setCurrentUser(data.user);
			}

			const mapKey = "dealpost:business-registration-meta-map";
			try {
				const mapRaw = JSON.parse(localStorage.getItem(mapKey) || "{}") || {};
				delete mapRaw[String(businessForm.businessName || "").trim()];
				localStorage.setItem(mapKey, JSON.stringify(mapRaw));
			} catch {
				// no-op
			}

			localStorage.removeItem("dealpost:business-registration-meta");
			setAcceptBusinessTerms(false);
			setActiveTab("overview");
			toast.success("Business profile removed");
		} catch (error) {
			toast.error(
				error?.response?.data?.message || "Unable to remove business profile",
			);
		} finally {
			setBusyAction("");
		}
	};

	const lat = Number(businessLocation.latitude);
	const lng = Number(businessLocation.longitude);
	const previewLat = Number.isFinite(lat) ? lat : DEFAULT_PREVIEW_COORDS.lat;
	const previewLng = Number.isFinite(lng) ? lng : DEFAULT_PREVIEW_COORDS.lng;
	const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${previewLat},${previewLng}`)}&z=${Number.isFinite(lat) && Number.isFinite(lng) ? 15 : 11}&output=embed`;

	return (
		<div className="min-h-screen bg-[#F7F8FA] flex flex-col">
			<Navbar />
			<main
				id="main-content"
				className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 lg:px-8"
			>
				<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
					<aside className="rounded-3xl border border-gray-200 bg-white p-4 lg:sticky lg:top-24 lg:h-fit">
						<p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
							Dashboard
						</p>
						<div className="space-y-1.5">
							<button
								type="button"
								onClick={() => setActiveTab("overview")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "overview"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<LayoutDashboard size={16} /> Overview
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("profile")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "profile"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<UserRoundCog size={16} /> Edit Profile
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("security")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "security"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<KeyRound size={16} /> Security
							</button>
							{hasBusinessAccount ? (
								<button
									type="button"
									onClick={() => setActiveTab("business")}
									className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
										activeTab === "business"
											? "bg-[#FFF5D1] text-[#5C4D00]"
											: "text-gray-700 hover:bg-gray-50"
									}`}
								>
									<Building2 size={16} /> Business Info
								</button>
							) : null}
							<button
								type="button"
								onClick={() => setActiveTab("sponsored")}
								className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
									activeTab === "sponsored"
										? "bg-[#FFF5D1] text-[#5C4D00]"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<Megaphone size={16} /> Sponsored Ads
							</button>
							<Link
								to="/messages"
								className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
							>
								<Mail size={16} /> Messages
							</Link>
						</div>

						<p className="px-3 pb-3 pt-5 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
							Settings
						</p>
						<div className="space-y-2">
							<button
								type="button"
								onClick={deactivateAccount}
								disabled={busyAction === "deactivate"}
								className="flex w-full items-center gap-2 rounded-xl bg-[#FFF1F1] px-3 py-2.5 text-sm font-semibold text-[#A33B3B] disabled:opacity-60"
							>
								<ShieldOff size={16} />
								{busyAction === "deactivate"
									? "Deactivating..."
									: "Deactivate Account"}
							</button>
							<button
								type="button"
								onClick={removeAccount}
								disabled={busyAction === "remove"}
								className="flex w-full items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								<Trash2 size={16} />
								{busyAction === "remove" ? "Removing..." : "Remove Account"}
							</button>
						</div>
					</aside>

					<section className="space-y-6">
						{activeTab === "overview" ? (
							<>
								<div className="rounded-3xl border border-gray-200 bg-white p-6">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<h1 className="text-3xl font-display font-bold text-black">
												User Dashboard
											</h1>
											<p className="mt-2 text-sm text-gray-500">
												Manage your profile, listings, and conversations in one
												place.
											</p>
										</div>
										<div className="flex gap-2">
											<Link
												to="/post-ad"
												className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
											>
												<PlusCircle size={16} /> Post Deal
											</Link>
											<Link
												to="/my-listings"
												className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
											>
												<Megaphone size={16} /> Manage Deals
											</Link>
										</div>
									</div>
									<div className="mt-5 rounded-2xl border border-[#FFE49A] bg-[#FFF9E5] p-4 text-sm text-[#5C4D00]">
										<div className="flex items-start gap-2">
											<AlertTriangle size={16} className="mt-0.5" />
											<p>
												Keep your profile and location updated for better buyer
												discovery.
											</p>
										</div>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Total Listings
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : listingStats.total}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Active Ads
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : listingStats.active}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Saved Products
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : likedListings.length}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Conversations
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : messageCount}
										</p>
									</div>
									<div className="rounded-2xl border border-gray-200 bg-white p-4">
										<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
											Sponsored Ads
										</p>
										<p className="mt-2 text-3xl font-display font-bold text-black">
											{dashboardLoading ? "-" : mySponsoredAds.length}
										</p>
									</div>
								</div>

								<div className="rounded-3xl border border-gray-200 bg-white p-6">
									<div className="mb-4 flex items-center justify-between">
										<h2 className="text-xl font-display font-bold text-black">
											Recent Listings
										</h2>
										<Link
											to="/my-listings"
											className="text-sm font-semibold text-[#8B7322]"
										>
											View all
										</Link>
									</div>

									{dashboardLoading ? (
										<p className="text-sm text-gray-500">Loading listings...</p>
									) : recentListings.length ? (
										<div className="grid gap-3 md:grid-cols-2">
											{recentListings.map((listing) => {
												const listingId =
													listing?.productId || listing?._id || listing?.id;
												const status = String(
													listing?.status || "active",
												).toLowerCase();
												return (
													<div
														key={listingId}
														className="rounded-2xl border border-gray-200 p-3"
													>
														<div className="flex items-start justify-between gap-3">
															<div className="min-w-0">
																<p className="line-clamp-1 text-sm font-semibold text-gray-900">
																	{listing?.title || "Untitled listing"}
																</p>
																<p className="mt-1 text-xs text-gray-500">
																	${Number(listing?.price || 0)}
																</p>
															</div>
															<span
																className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
																	status === "sold"
																		? "bg-green-50 text-green-700"
																		: status === "pending"
																			? "bg-orange-50 text-orange-700"
																			: "bg-[#FFF9E5] text-[#8B7322]"
																}`}
															>
																{status}
															</span>
														</div>
														<div className="mt-3 flex gap-2">
															<Link
																to={`/listing/${listingId}`}
																className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700"
															>
																<ShoppingBag size={12} /> View
															</Link>
															<Link
																to="/my-listings"
																className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700"
															>
																<BadgeCheck size={12} /> Manage
															</Link>
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
											<p className="text-sm font-semibold text-gray-700">
												You have no listings yet.
											</p>
											<p className="mt-1 text-xs text-gray-500">
												Create your first ad to make your dashboard come alive.
											</p>
											<Link
												to="/post-ad"
												className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
											>
												<PlusCircle size={14} /> Start Listing
											</Link>
										</div>
									)}
								</div>
							</>
						) : null}

						{activeTab === "profile" ? <Profile embedded /> : null}

						{activeTab === "security" ? (
							<form
								onSubmit={updatePassword}
								className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6"
							>
								<h2 className="text-2xl font-display font-bold text-black">
									Security
								</h2>
								<input
									type="password"
									value={passwordForm.currentPassword}
									onChange={(event) =>
										setPasswordForm((prev) => ({
											...prev,
											currentPassword: event.target.value,
										}))
									}
									placeholder="Current password"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								<input
									type="password"
									value={passwordForm.newPassword}
									onChange={(event) =>
										setPasswordForm((prev) => ({
											...prev,
											newPassword: event.target.value,
										}))
									}
									placeholder="New password"
									className="h-11 w-full rounded-xl border border-gray-200 px-3"
								/>
								<button
									type="submit"
									disabled={busyAction === "password"}
									className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
								>
									{busyAction === "password"
										? "Updating..."
										: "Change Password"}
								</button>
							</form>
						) : null}

						{activeTab === "business" && hasBusinessAccount ? (
							<form onSubmit={saveBusinessInfo} className="space-y-8">
								<section className="grid gap-4 md:grid-cols-12">
									<article className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm md:col-span-7 lg:col-span-8">
										<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black">
											<ImagePlus size={20} className="text-[#D4B200]" />
											Logo & Brand Name
										</h2>
										<div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
											<div>
												<label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#666666]">
													Business Logo
												</label>
												<label
													htmlFor="dashboard-business-logo"
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
													id="dashboard-business-logo"
													type="file"
													name="logo"
													accept="image/png,image/jpeg,image/webp,image/gif"
													onChange={handleBusinessImageChange}
													className="sr-only"
												/>
												<p className="mt-2 text-xs text-[#7A7A7A]">
													Upload only if you want to update your current logo.
												</p>
											</div>
											<div className="space-y-4">
												<FormField
													id="dashboard-business-name"
													name="businessName"
													label="Business Name"
													required
													value={businessForm.businessName}
													onChange={handleBusinessChange}
													placeholder="e.g. Sharma Electronics"
													error={
														showBusinessValidation &&
														!businessForm.businessName.trim()
															? "Business name is required"
															: ""
													}
												/>
												<FormField
													id="dashboard-business-gst-msme"
													name="gstOrMsme"
													label="GST/MSME No"
													required
													value={businessForm.gstOrMsme}
													onChange={handleBusinessChange}
													placeholder="Enter GSTIN or MSME number"
													error={
														showBusinessValidation &&
														!businessForm.gstOrMsme.trim()
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
											htmlFor="dashboard-business-banner"
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
													<span className="text-xs font-semibold">
														Upload banner
													</span>
												</div>
											)}
										</label>
										<input
											id="dashboard-business-banner"
											type="file"
											name="banner"
											accept="image/png,image/jpeg,image/webp,image/gif"
											onChange={handleBusinessImageChange}
											className="sr-only"
										/>
										<p className="mt-3 text-xs text-[#7A7A7A] leading-relaxed">
											Recommended ratio 16:9. Ideal resolution 1920 x 1080 px.
										</p>
									</article>

									<article className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm md:col-span-7 lg:col-span-8">
										<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-black">
											<FileText size={20} className="text-[#D4B200]" />
											Business Details
										</h2>
										<div className="space-y-5">
											<FormField
												id="dashboard-business-description"
												as="textarea"
												name="description"
												label="Business Description"
												required
												rows={4}
												value={businessForm.description}
												onChange={handleBusinessChange}
												placeholder="Briefly describe your business and services"
												error={
													showBusinessValidation &&
													!businessForm.description.trim()
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
														<div
															ref={autocompleteContainerRef}
															className="w-full"
														/>
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
																<div className="px-1 text-xs text-gray-500">
																	Searching...
																</div>
															) : null}
															{fallbackSuggestions.length ? (
																<div className="max-h-44 overflow-auto rounded-xl border border-gray-200">
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
														<div className="grid h-56 place-items-center bg-[#f8f8f8] text-sm text-gray-500">
															Pick a valid address to preview map
														</div>
													)}
												</div>
												<p className="mt-2 text-xs text-gray-500">
													Search the exact business location, then click on map
													to fine-tune the pin.
												</p>
												{showBusinessValidation &&
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
															onClick={() =>
																setIsCategoryPickerOpen((prev) => !prev)
															}
															className="flex h-12 w-full items-center justify-between rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-4 text-left text-[0.95rem] text-black outline-none focus:ring-2 focus:ring-[#FFD600]/50"
															aria-haspopup="listbox"
															aria-expanded={isCategoryPickerOpen}
														>
															<span
																className={
																	businessForm.category ? "" : "text-[#888888]"
																}
															>
																{businessForm.category || "Select category"}
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
																						selectBusinessCategory(
																							section.title,
																						)
																					}
																					className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-sm font-bold text-[#1A1A1A] hover:bg-white"
																				>
																					<span className="line-clamp-1">
																						{section.title}
																					</span>
																					{businessForm.category ===
																					section.title ? (
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
																													{businessForm.category ===
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
													{businessForm.category ? (
														<p className="mt-2 text-xs text-[#7A7A7A]">
															Selected: {businessForm.category}
														</p>
													) : null}
													{showBusinessValidation &&
													!businessForm.category.trim() ? (
														<p
															className="mt-2 text-xs font-medium text-red-600"
															role="alert"
														>
															Business category is required
														</p>
													) : null}
												</div>
												<FormField
													id="dashboard-business-additional-category"
													name="additionalCategory"
													label="Add More Category"
													value={businessForm.additionalCategory}
													onChange={handleBusinessChange}
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
												<ShieldCheck
													size={16}
													className="mt-0.5 text-green-600"
												/>
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
												checked={acceptBusinessTerms}
												onChange={(event) =>
													setAcceptBusinessTerms(event.target.checked)
												}
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
										{showBusinessValidation && !acceptBusinessTerms ? (
											<p
												className="mt-2 text-xs font-medium text-red-600"
												role="alert"
											>
												Please accept terms and conditions
											</p>
										) : null}
									</article>
								</section>

								<div className="flex flex-wrap items-center justify-end gap-2">
									<Button
										type="submit"
										disabled={busyAction === "business-save"}
										isLoading={busyAction === "business-save"}
										size="lg"
										className="rounded-full px-8"
									>
										{busyAction === "business-save"
											? "Saving..."
											: "Update Business Info"}
									</Button>
									<button
										type="button"
										onClick={removeBusinessInfo}
										disabled={busyAction === "business-delete"}
										className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60"
									>
										<Trash2 size={14} />
										{busyAction === "business-delete"
											? "Removing..."
											: "Remove Business Profile"}
									</button>
								</div>
							</form>
						) : null}

						{activeTab === "sponsored" ? (
							<section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6">
								<h2 className="text-2xl font-display font-bold text-black">
									Sponsored Ads
								</h2>
								<p className="text-sm text-gray-500">
									Create sponsored ads. They become public only after admin
									approval.
								</p>
								<form
									onSubmit={saveSponsored}
									className="grid gap-3 md:grid-cols-2"
								>
									<input
										value={sponsoredForm.title}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												title: event.target.value,
											}))
										}
										placeholder="Ad title"
										className="h-11 rounded-xl border border-gray-200 px-3"
									/>
									<input
										value={sponsoredForm.imageUrl}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												imageUrl: event.target.value,
											}))
										}
										placeholder="Image URL"
										className="h-11 rounded-xl border border-gray-200 px-3"
									/>
									<input
										value={sponsoredForm.targetUrl}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												targetUrl: event.target.value,
											}))
										}
										placeholder="Target URL"
										className="h-11 rounded-xl border border-gray-200 px-3"
									/>
									<select
										value={sponsoredForm.placement}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												placement: event.target.value,
											}))
										}
										className="h-11 rounded-xl border border-gray-200 px-3"
									>
										<option value="any">Any sidebar</option>
										<option value="left">Left sidebar</option>
										<option value="right">Right sidebar</option>
									</select>
									<textarea
										value={sponsoredForm.description}
										onChange={(event) =>
											setSponsoredForm((prev) => ({
												...prev,
												description: event.target.value,
											}))
										}
										rows={3}
										placeholder="Description"
										className="rounded-xl border border-gray-200 px-3 py-2 md:col-span-2"
									/>
									<div className="md:col-span-2 flex gap-2">
										<button
											type="submit"
											disabled={busyAction === "sponsored-save"}
											className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
										>
											{editingSponsoredId
												? "Update & Resubmit"
												: "Submit For Approval"}
										</button>
										{editingSponsoredId ? (
											<button
												type="button"
												onClick={resetSponsoredForm}
												className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700"
											>
												Cancel
											</button>
										) : null}
									</div>
								</form>

								<div className="space-y-2">
									{mySponsoredAds.length ? (
										mySponsoredAds.map((ad) => (
											<div
												key={ad.id}
												className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 p-3"
											>
												<img
													src={ad.imageUrl}
													alt={ad.title}
													className="h-14 w-14 rounded-xl object-cover"
												/>
												<div className="min-w-0 flex-1">
													<p className="line-clamp-1 text-sm font-semibold text-gray-900">
														{ad.title}
													</p>
													<p className="line-clamp-1 text-xs text-gray-500">
														{ad.targetUrl}
													</p>
												</div>
												<span
													className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${ad.status === "approved" ? "bg-green-50 text-green-700" : ad.status === "rejected" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}`}
												>
													{ad.status}
												</span>
												<button
													type="button"
													onClick={() => startSponsoredEdit(ad)}
													className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700"
												>
													Edit
												</button>
												<button
													type="button"
													disabled={busyAction === `sponsored-delete-${ad.id}`}
													onClick={() => removeSponsored(ad.id)}
													className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
												>
													Delete
												</button>
											</div>
										))
									) : (
										<p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
											No sponsored ads submitted yet.
										</p>
									)}
								</div>
							</section>
						) : null}
					</section>
				</div>
			</main>
			<Footer />
		</div>
	);
}
