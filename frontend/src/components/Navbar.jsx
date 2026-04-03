import {
	Bell,
	ChevronDown,
	Crosshair,
	ExternalLink,
	Heart,
	Menu,
	MapPin,
	MessageSquare,
	Plus,
	Search,
	X,
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import {
	loadGoogleMapsPlaces,
	mountPlaceAutocompleteElement,
} from "../utils/googleMaps";
import { getUnreadConversationCount } from "../utils/messageNotifications";

const ALERTS_CACHE_TTL_MS = 15000;
let publicConfigPromise = null;
let cachedPublicConfig = null;
let cachedAlerts = { ts: 0, rows: [] };

function getReadableLocationLabel(placeLike) {
	if (!placeLike) return "";
	if (typeof placeLike.formattedAddress === "string") {
		return placeLike.formattedAddress;
	}

	const components = placeLike.address_components || [];
	const findComponent = (types) =>
		components.find((item) => types.every((type) => item.types?.includes(type)))
			?.long_name;

	const area =
		findComponent(["sublocality", "sublocality_level_1"]) ||
		findComponent(["neighborhood"]) ||
		findComponent(["route"]) ||
		findComponent(["locality"]);

	const city =
		findComponent(["locality"]) ||
		findComponent(["administrative_area_level_2"]) ||
		findComponent(["administrative_area_level_1"]);

	if (area && city && area !== city) {
		return `${area}, ${city}`;
	}

	return area || city || placeLike.formatted_address || placeLike.name || "";
}

function BrandLogo() {
	return (
		<a href="/" className="flex items-center gap-2 text-xl shrink-0">
			<img src="/logo.png" alt="DealPost Logo" className="h-7 w-7" />
			<div className="text-black">
				<span className="font-bold">Deal</span>
				<span>Post</span>
			</div>
		</a>
	);
}

/* ── Inline location picker used in both desktop dropdown and mobile drawer ── */
function LocationPicker({
	locationInput,
	setLocationInput,
	mapsReady,
	mapsFailed,
	isDetectingLocation,
	isSavingLocation,
	autocompleteContainerRef,
	onUseCurrentLocation,
	onSave,
	onClose,
}) {
	return (
		<div className="w-full">
			<div className="mb-2 flex items-center justify-between">
				<p className="text-sm font-bold text-black">Change Location</p>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="grid h-11 w-11 place-items-center text-gray-500 hover:text-black"
						aria-label="Close location picker"
					>
						<X size={14} />
					</button>
				)}
			</div>
			<div className="rounded-xl border border-gray-200 p-1">
				{mapsReady ? (
					<div ref={autocompleteContainerRef} className="w-full" />
				) : (
					<input
						value={locationInput}
						onChange={(event) => {
							setLocationInput(event.target.value);
						}}
						placeholder={
							mapsFailed
								? "Type location (Google unavailable)"
								: "Loading location search..."
						}
						className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#FFD600]"
					/>
				)}
			</div>
			<div className="mt-2 flex items-center justify-between">
				<button
					type="button"
					disabled={isDetectingLocation}
					onClick={onUseCurrentLocation}
					className="inline-flex items-center gap-1 rounded-lg bg-[#f6f6f6] px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
				>
					<Crosshair size={13} />
					{isDetectingLocation ? "Detecting..." : "Use current"}
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={!locationInput.trim() || isSavingLocation}
					className="rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-60"
				>
					{isSavingLocation ? "Saving..." : "Save"}
				</button>
			</div>
		</div>
	);
}

export default function Navbar({
	search: externalSearch = "",
	onSearchChange,
}) {
	const { user, setCurrentUser, isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();
	const [internalSearch, setInternalSearch] = useState("");
	const search = onSearchChange ? externalSearch : internalSearch;
	const [unreadCount, setUnreadCount] = useState(0);
	const [recentConversations, setRecentConversations] = useState([]);
	const [recentAlerts, setRecentAlerts] = useState([]);
	const [isMessagesOpen, setIsMessagesOpen] = useState(false);
	const [isAlertsOpen, setIsAlertsOpen] = useState(false);
	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
	const [searchSuggestions, setSearchSuggestions] = useState([]);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
	const [showSearchDropdown, setShowSearchDropdown] = useState(false);
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
	/* Mobile-only: slide-down search bar */
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	const locationMenuId = "location-menu";
	const messagesMenuId = "messages-menu";
	const alertsMenuId = "alerts-menu";
	const profileMenuId = "profile-menu";
	const mobileNavId = "mobile-primary-nav";

	const initialLocation =
		localStorage.getItem("selectedLocation") ||
		user?.location ||
		"Chennai, India";
	const initialCoords = (() => {
		try {
			const raw = sessionStorage.getItem("selectedLocationCoords");
			if (!raw) return { lat: null, lng: null };
			const parsed = JSON.parse(raw);
			if (!Number.isFinite(parsed?.lat) || !Number.isFinite(parsed?.lng)) {
				return { lat: null, lng: null };
			}
			return { lat: parsed.lat, lng: parsed.lng };
		} catch {
			return { lat: null, lng: null };
		}
	})();

	const [isLocationOpen, setIsLocationOpen] = useState(false);
	const [locationInput, setLocationInput] = useState(initialLocation);
	const [displayLocation, setDisplayLocation] = useState(initialLocation);
	const [mapsReady, setMapsReady] = useState(false);
	const [mapsFailed, setMapsFailed] = useState(false);
	const [isSavingLocation, setIsSavingLocation] = useState(false);
	const [isDetectingLocation, setIsDetectingLocation] = useState(false);
	const [selectedCoordinates, setSelectedCoordinates] = useState(initialCoords);
	const [selectedPlaceId, setSelectedPlaceId] = useState("");

	const locationWrapperRef = useRef(null);
	const autocompleteContainerRef = useRef(null);
	/* Separate ref for the autocomplete inside the mobile drawer */
	const mobileAutocompleteContainerRef = useRef(null);
	const actionsRef = useRef(null);
	const searchRef = useRef(null);
	const mobileSearchRef = useRef(null);

	const profileDashboardRoute = useMemo(() => {
		const role = String(user?.role || "")
			.toLowerCase()
			.trim();
		return role === "admin" || role === "developer" ? "/admin" : "/dashboard";
	}, [user?.role]);

	const redirectUnauthenticatedUser = () => {
		if (isAuthenticated) return false;
		setIsMessagesOpen(false);
		setIsAlertsOpen(false);
		setIsProfileMenuOpen(false);
		navigate("/login");
		return true;
	};

	const onProfileAvatarClick = () => {
		if (redirectUnauthenticatedUser()) return;
		setIsProfileMenuOpen((prev) => !prev);
		setIsMessagesOpen(false);
		setIsAlertsOpen(false);
	};

	const onProfileDashboardClick = () => {
		setIsProfileMenuOpen(false);
		navigate(profileDashboardRoute);
	};

	const onProfileLogoutClick = () => {
		setIsProfileMenuOpen(false);
		logout();
		navigate("/login");
	};

	/* ── Load Google Maps ── */
	useEffect(() => {
		let active = true;

		const setupMaps = async () => {
			try {
				if (!cachedPublicConfig) {
					if (!publicConfigPromise) {
						publicConfigPromise = api
							.get("/config/public")
							.then((response) => response.data)
							.finally(() => {
								publicConfigPromise = null;
							});
					}
					cachedPublicConfig = await publicConfigPromise;
				}

				await loadGoogleMapsPlaces(
					cachedPublicConfig?.googleMapsBrowserApiKey || "",
				);
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

		setupMaps();
		return () => {
			active = false;
		};
	}, []);

	/* ── Desktop autocomplete ── */
	useEffect(() => {
		if (!isLocationOpen || !mapsReady || !autocompleteContainerRef.current) {
			return;
		}

		return mountPlaceAutocompleteElement({
			container: autocompleteContainerRef.current,
			placeholder: "Search for area, city, or address",
			onPlaceSelected: (place) => {
				const nextLocation =
					getReadableLocationLabel(place) ||
					place.formattedAddress ||
					place.displayName ||
					"";
				setLocationInput(nextLocation);
				setSelectedCoordinates({
					lat: Number.isFinite(place.lat) ? place.lat : null,
					lng: Number.isFinite(place.lng) ? place.lng : null,
				});
				setSelectedPlaceId(String(place.id || ""));
			},
		});
	}, [isLocationOpen, mapsReady]);

	/* ── Mobile drawer autocomplete ── */
	useEffect(() => {
		if (
			!isMobileNavOpen ||
			!mapsReady ||
			!mobileAutocompleteContainerRef.current
		) {
			return;
		}

		return mountPlaceAutocompleteElement({
			container: mobileAutocompleteContainerRef.current,
			placeholder: "Search for area, city, or address",
			onPlaceSelected: (place) => {
				const nextLocation =
					getReadableLocationLabel(place) ||
					place.formattedAddress ||
					place.displayName ||
					"";
				setLocationInput(nextLocation);
				setSelectedCoordinates({
					lat: Number.isFinite(place.lat) ? place.lat : null,
					lng: Number.isFinite(place.lng) ? place.lng : null,
				});
				setSelectedPlaceId(String(place.id || ""));
			},
		});
	}, [isMobileNavOpen, mapsReady]);

	const geocodeByAddress = async (addressText) => {
		if (!window.google?.maps?.Geocoder || !String(addressText || "").trim()) {
			return null;
		}

		const geocoder = new window.google.maps.Geocoder();
		return new Promise((resolve) => {
			geocoder.geocode(
				{ address: String(addressText).trim() },
				(results, status) => {
					if (status !== "OK" || !results?.length) {
						resolve(null);
						return;
					}

					const best = results[0];
					const lat = best?.geometry?.location?.lat?.();
					const lng = best?.geometry?.location?.lng?.();
					if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
						resolve(null);
						return;
					}

					resolve({
						lat,
						lng,
						placeId: best?.place_id || "",
						formattedAddress:
							best?.formatted_address || String(addressText).trim(),
					});
				},
			);
		});
	};

	/* ── Close desktop location picker on outside click ── */
	useEffect(() => {
		const onClickOutside = (event) => {
			if (!locationWrapperRef.current?.contains(event.target)) {
				setIsLocationOpen(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	/* ── Unread messages ── */
	const refreshUnreadCount = useCallback(async () => {
		if (!isAuthenticated || !user?.id) {
			setUnreadCount(0);
			setRecentConversations([]);
			return;
		}

		try {
			const { data } = await api.get("/conversations");
			const rows = Array.isArray(data?.conversations) ? data.conversations : [];
			setUnreadCount(getUnreadConversationCount(rows, user.id));
			setRecentConversations(rows.slice(0, 5));
		} catch {
			// Ignore unread badge refresh failures.
		}
	}, [isAuthenticated, user?.id]);

	const refreshRecentAlerts = useCallback(async () => {
		try {
			const now = Date.now();
			if (
				Array.isArray(cachedAlerts.rows) &&
				now - cachedAlerts.ts < ALERTS_CACHE_TTL_MS
			) {
				setRecentAlerts(cachedAlerts.rows);
				return;
			}

			const { data } = await api.get("/listings", {
				params: { limit: 5, sort: "Newest" },
			});
			const rows = Array.isArray(data?.listings) ? data.listings : [];
			cachedAlerts = { ts: now, rows };
			setRecentAlerts(rows);
		} catch {
			setRecentAlerts([]);
		}
	}, []);

	useEffect(() => {
		if (!isAuthenticated || !user?.id) {
			setUnreadCount(0);
			return;
		}

		refreshUnreadCount();
		const intervalId = window.setInterval(refreshUnreadCount, 7000);
		const onSeenUpdated = () => refreshUnreadCount();
		window.addEventListener(
			"dealpost:conversation-seen-updated",
			onSeenUpdated,
		);

		return () => {
			window.clearInterval(intervalId);
			window.removeEventListener(
				"dealpost:conversation-seen-updated",
				onSeenUpdated,
			);
		};
	}, [isAuthenticated, refreshUnreadCount, user?.id]);

	/* ── Close desktop popups on outside click ── */
	useEffect(() => {
		const onClickOutside = (event) => {
			if (actionsRef.current?.contains(event.target)) return;
			setIsMessagesOpen(false);
			setIsAlertsOpen(false);
			setIsProfileMenuOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	/* ── Close search dropdown on outside click ── */
	useEffect(() => {
		const onClickOutside = (event) => {
			if (
				searchRef.current?.contains(event.target) ||
				mobileSearchRef.current?.contains(event.target)
			)
				return;
			setShowSearchDropdown(false);
			setIsSearchFocused(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	/* ── Escape closes active non-dialog overlays ── */
	useEffect(() => {
		const onEscape = (event) => {
			if (event.key !== "Escape") return;
			setIsLocationOpen(false);
			setIsMessagesOpen(false);
			setIsAlertsOpen(false);
			setIsProfileMenuOpen(false);
			setShowSearchDropdown(false);
			setIsSearchFocused(false);
			setIsMobileSearchOpen(false);
		};

		document.addEventListener("keydown", onEscape);
		return () => document.removeEventListener("keydown", onEscape);
	}, []);

	useEffect(() => {
		if (!isMobileNavOpen) return;
		setIsLocationOpen(false);
		setIsMessagesOpen(false);
		setIsAlertsOpen(false);
		setIsProfileMenuOpen(false);
		setShowSearchDropdown(false);
		setIsSearchFocused(false);
		setIsMobileSearchOpen(false);
	}, [isMobileNavOpen]);

	/* ── Search suggestions ── */
	useEffect(() => {
		const keyword = String(search || "").trim();
		if (keyword.length < 2) {
			setSearchSuggestions([]);
			setShowSearchDropdown(false);
			return;
		}

		const timeoutId = window.setTimeout(async () => {
			try {
				setIsSearchingSuggestions(true);
				const { data } = await api.get("/listings", {
					params: { search: keyword, limit: 6, sort: "Newest" },
				});
				setSearchSuggestions(
					Array.isArray(data?.listings) ? data.listings : [],
				);
				if (isSearchFocused) {
					setShowSearchDropdown(true);
				}
			} catch {
				setSearchSuggestions([]);
			} finally {
				setIsSearchingSuggestions(false);
			}
		}, 250);

		return () => window.clearTimeout(timeoutId);
	}, [isSearchFocused, search]);

	/* ── Persist location ── */
	const persistLocation = async (afterSave) => {
		let next = locationInput.trim();
		if (!next) return;

		setIsSavingLocation(true);

		let coordsToPersist = { ...selectedCoordinates };
		let placeIdToPersist = selectedPlaceId;
		if (
			mapsReady &&
			(!Number.isFinite(coordsToPersist.lat) ||
				!Number.isFinite(coordsToPersist.lng))
		) {
			const geocoded = await geocodeByAddress(next);
			if (geocoded) {
				next = geocoded.formattedAddress;
				coordsToPersist = { lat: geocoded.lat, lng: geocoded.lng };
				placeIdToPersist = geocoded.placeId;
				setLocationInput(geocoded.formattedAddress);
				setSelectedCoordinates({ lat: geocoded.lat, lng: geocoded.lng });
				setSelectedPlaceId(geocoded.placeId);
			}
		}

		setDisplayLocation(next);
		localStorage.setItem("selectedLocation", next);

		if (
			Number.isFinite(coordsToPersist.lat) &&
			Number.isFinite(coordsToPersist.lng)
		) {
			sessionStorage.setItem(
				"selectedLocationCoords",
				JSON.stringify({
					lat: coordsToPersist.lat,
					lng: coordsToPersist.lng,
				}),
			);
			if (placeIdToPersist) {
				sessionStorage.setItem("selectedLocationPlaceId", placeIdToPersist);
			}
		} else {
			sessionStorage.removeItem("selectedLocationCoords");
			sessionStorage.removeItem("selectedLocationPlaceId");
		}

		window.dispatchEvent(
			new CustomEvent("dealpost:location-changed", {
				detail: {
					location: next,
					lat: coordsToPersist.lat,
					lng: coordsToPersist.lng,
					placeId: placeIdToPersist || "",
				},
			}),
		);

		if (isAuthenticated) {
			try {
				const { data } = await api.put("/users/me", { location: next });
				setCurrentUser(data?.user || user);
			} catch {
				// Keep local selection even if profile update fails.
			}
		}

		setIsSavingLocation(false);
		setIsLocationOpen(false);
		afterSave?.();
	};

	const useCurrentLocation = () => {
		if (!navigator.geolocation) return;

		setIsDetectingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;
				setSelectedCoordinates({ lat, lng });
				setSelectedPlaceId("");

				if (window.google?.maps?.Geocoder) {
					const geocoder = new window.google.maps.Geocoder();
					geocoder.geocode(
						{ location: { lat, lng }, language: "en" },
						(results, status) => {
							if (status === "OK" && results?.length) {
								const preferredResult =
									results.find((item) =>
										item.types?.some((type) =>
											[
												"sublocality",
												"sublocality_level_1",
												"neighborhood",
												"route",
												"locality",
											].includes(type),
										),
									) || results[0];

								const label = getReadableLocationLabel(preferredResult);
								setLocationInput(
									label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
								);
							} else {
								setLocationInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
							}
							setIsDetectingLocation(false);
						},
					);
					return;
				}

				setLocationInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
				setIsDetectingLocation(false);
			},
			() => {
				setIsDetectingLocation(false);
				toast.error("Unable to detect current location");
			},
		);
	};

	const onSearchInputChange = (value) => {
		if (onSearchChange) {
			onSearchChange(value);
		} else {
			setInternalSearch(value);
		}
		setIsSearchFocused(true);
		setActiveSuggestionIndex(-1);
		if (String(value || "").trim().length < 2) {
			setShowSearchDropdown(false);
		}
	};

	const closeSearchSuggestions = () => {
		setShowSearchDropdown(false);
		setIsSearchFocused(false);
		setActiveSuggestionIndex(-1);
	};

	const onSelectSuggestion = (item) => {
		navigate(`/listing/${item?.productId || item?.id}`);
		setIsMobileSearchOpen(false);
		closeSearchSuggestions();
	};

	const onSearchInputKeyDown = (event) => {
		if (!shouldShowDropdown) {
			if (event.key === "ArrowDown" && searchSuggestions.length) {
				event.preventDefault();
				setShowSearchDropdown(true);
				setIsSearchFocused(true);
				setActiveSuggestionIndex(0);
			}
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveSuggestionIndex((prev) => {
				if (!searchSuggestions.length) return -1;
				return prev >= searchSuggestions.length - 1 ? 0 : prev + 1;
			});
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveSuggestionIndex((prev) => {
				if (!searchSuggestions.length) return -1;
				if (prev <= 0) return searchSuggestions.length - 1;
				return prev - 1;
			});
		}

		if (event.key === "Enter" && activeSuggestionIndex >= 0) {
			event.preventDefault();
			const selected = searchSuggestions[activeSuggestionIndex];
			if (selected) {
				onSelectSuggestion(selected);
			}
		}

		if (event.key === "Escape") {
			event.preventDefault();
			closeSearchSuggestions();
		}
	};

	const shouldShowDropdown =
		showSearchDropdown &&
		isSearchFocused &&
		(searchSuggestions.length > 0 || isSearchingSuggestions);

	useEffect(() => {
		if (!searchSuggestions.length) {
			setActiveSuggestionIndex(-1);
			return;
		}

		setActiveSuggestionIndex((prev) => {
			if (prev < 0 || prev >= searchSuggestions.length) return -1;
			return prev;
		});
	}, [searchSuggestions]);

	const primaryNavItems = [
		{ label: "Business Listings", to: "/business-listings" },
		{
			label: "Auctions",
			to: "/explore?listingType=auction&sort=Auction%20Ending%20Soon",
		},
		{ label: "Marketplace", to: "/explore" },
		{ label: "My Listings", to: "/my-listings" },
		{ label: "Categories", to: "/categories" },
		{ label: "Services", to: "/explore?category=Services" },
		{ label: "Top Deals", to: "/explore?sort=Most%20Popular" },
		{ label: "Help Center", to: "/help-center" },
		{ label: "Compare", to: "/compare" },
	];

	const openMessagesPopup = () => {
		if (redirectUnauthenticatedUser()) return;
		setIsMessagesOpen((prev) => !prev);
		setIsAlertsOpen(false);
		setIsProfileMenuOpen(false);
	};

	const openAlertsPopup = () => {
		if (redirectUnauthenticatedUser()) return;
		setIsAlertsOpen((prev) => {
			const next = !prev;
			if (next) refreshRecentAlerts();
			return next;
		});
		setIsMessagesOpen(false);
		setIsProfileMenuOpen(false);
	};

	const onMessagesPageClick = () => {
		setIsMessagesOpen(false);
		navigate("/messages");
	};

	/* Shared search suggestions dropdown content */
	const SearchDropdown = () =>
		shouldShowDropdown ? (
			<div
				className="absolute top-12 z-50 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
				role="listbox"
				id="navbar-search-suggestions"
				aria-label="Search suggestions"
			>
				{isSearchingSuggestions ? (
					<p className="px-4 py-3 text-sm text-gray-500">Searching...</p>
				) : (
					<>
						{searchSuggestions.map((item, index) => (
							<button
								key={item?.id || item?.productId}
								type="button"
								role="option"
								id={`navbar-search-option-${item?.id || item?.productId}`}
								aria-selected={activeSuggestionIndex === index}
								onMouseEnter={() => {
									setActiveSuggestionIndex(index);
								}}
								onClick={() => onSelectSuggestion(item)}
								className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
							>
								<div>
									<p className="text-sm font-semibold text-gray-900">
										{item?.title || "Listing"}
									</p>
									<p className="text-xs text-gray-500">
										{item?.location?.name || item?.location || ""}
									</p>
								</div>
								<ExternalLink size={14} className="text-gray-400" />
							</button>
						))}
					</>
				)}
			</div>
		) : null;

	return (
		<header
			className="sticky top-0 z-40 border-b border-gray-100 bg-white"
			role="banner"
		>
			{/* ═══════════════════════════════════════════════════
			    TOP BAR
			═══════════════════════════════════════════════════ */}
			<div className="flex h-14 sm:h-16 w-full items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-3 lg:gap-8">
				{/* Brand */}
				<BrandLogo />

				{/* Location — desktop only */}
				<div
					className="relative hidden lg:flex shrink-0"
					ref={locationWrapperRef}
				>
					<button
						type="button"
						onClick={() => setIsLocationOpen((prev) => !prev)}
						className="flex cursor-pointer items-center gap-1.5 text-sm"
						aria-expanded={isLocationOpen}
						aria-controls={locationMenuId}
						aria-label="Choose location"
					>
						<MapPin size={16} className="text-[#8B7322]" />
						<span className="max-w-[180px] truncate font-bold text-black">
							{displayLocation}
						</span>
						<ChevronDown size={16} className="text-gray-400" />
					</button>
					{isLocationOpen && (
						<div
							id={locationMenuId}
							className="absolute left-0 top-9 z-50 w-[min(90vw,360px)] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
						>
							<LocationPicker
								locationInput={locationInput}
								setLocationInput={(v) => {
									setLocationInput(v);
									setSelectedCoordinates({ lat: null, lng: null });
									sessionStorage.removeItem("selectedLocationCoords");
								}}
								mapsReady={mapsReady}
								mapsFailed={mapsFailed}
								isDetectingLocation={isDetectingLocation}
								isSavingLocation={isSavingLocation}
								autocompleteContainerRef={autocompleteContainerRef}
								onUseCurrentLocation={useCurrentLocation}
								onSave={() => persistLocation()}
								onClose={() => setIsLocationOpen(false)}
							/>
						</div>
					)}
				</div>

				{/* Search bar — desktop/tablet (md+) */}
				<div className="mx-2 hidden flex-1 items-center justify-center md:flex lg:mx-8">
					<div className="relative w-full max-w-2xl" ref={searchRef}>
						<form
							role="search"
							aria-label="Site search"
							className="flex w-full items-center rounded-full bg-[#F1F1F1] px-4 py-2 lg:py-2.5"
							onSubmit={(event) => event.preventDefault()}
						>
							<Search size={18} className="text-gray-500 shrink-0" />
							<input
								value={search}
								onChange={(event) => onSearchInputChange(event.target.value)}
								onKeyDown={onSearchInputKeyDown}
								onFocus={() => {
									setIsSearchFocused(true);
									if (searchSuggestions.length || isSearchingSuggestions) {
										setShowSearchDropdown(true);
									}
								}}
								role="searchbox"
								aria-label="Search listings"
								aria-expanded={shouldShowDropdown}
								aria-controls="navbar-search-suggestions"
								aria-activedescendant={
									activeSuggestionIndex >= 0
										? `navbar-search-option-${searchSuggestions[activeSuggestionIndex]?.id || searchSuggestions[activeSuggestionIndex]?.productId}`
										: undefined
								}
								autoComplete="off"
								placeholder="Find Cars, Mobile Phones, and more..."
								className="ml-3 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
							/>
						</form>
						<SearchDropdown />
					</div>
				</div>

				{/* Actions */}
				<div
					className="ml-auto flex items-center gap-1 sm:gap-2 lg:gap-1"
					ref={actionsRef}
				>
					{/* Mobile: search toggle */}
					<button
						type="button"
						onClick={() => setIsMobileSearchOpen((prev) => !prev)}
						className="grid h-9 w-9 place-items-center text-black transition hover:opacity-70 md:hidden"
						aria-label="Toggle search"
					>
						{isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
					</button>

					{/* Messages — hidden on smallest screens (shown in drawer) */}
					<button
						type="button"
						onClick={openMessagesPopup}
						className="relative hidden sm:grid h-9 w-9 sm:h-10 sm:w-10 place-items-center text-black transition hover:opacity-70"
						aria-label="Messages"
						aria-haspopup="dialog"
						aria-expanded={isMessagesOpen}
						aria-controls={messagesMenuId}
					>
						<MessageSquare size={20} />
						{unreadCount > 0 && (
							<span className="absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						)}
					</button>
					{isMessagesOpen && (
						<div
							id={messagesMenuId}
							className="absolute right-0 sm:right-36 lg:right-44 top-14 sm:top-16 z-50 w-[calc(100vw-24px)] sm:w-80 rounded-2xl border border-gray-200 bg-white shadow-xl mx-3 sm:mx-0"
						>
							<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
								<p className="text-sm font-bold text-gray-900">
									Recent Messages
								</p>
								<button
									type="button"
									onClick={() => setIsMessagesOpen(false)}
									className="grid h-8 w-8 place-items-center text-gray-400 hover:text-black sm:hidden"
								>
									<X size={16} />
								</button>
							</div>
							<div className="max-h-72 overflow-y-auto">
								{recentConversations.length ? (
									recentConversations.map((conversation) => {
										const me = Number(user?.id);
										const isBuyer = Number(conversation?.buyerId) === me;
										const participant = isBuyer
											? conversation?.seller
											: conversation?.buyer;
										return (
											<button
												key={conversation?.id}
												type="button"
												onClick={onMessagesPageClick}
												className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
											>
												<p className="text-sm font-semibold text-gray-900">
													{participant?.name || "User"}
												</p>
												<p className="line-clamp-1 text-xs text-gray-500">
													{conversation?.lastMessage?.text || "No messages yet"}
												</p>
											</button>
										);
									})
								) : (
									<p className="px-4 py-6 text-sm text-gray-500">
										No recent messages
									</p>
								)}
							</div>
							<div className="p-3">
								<button
									type="button"
									onClick={onMessagesPageClick}
									className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
								>
									View All Messages
								</button>
							</div>
						</div>
					)}

					{/* Favorites — hidden on mobile */}
					<button
						type="button"
						onClick={() => navigate("/favorites")}
						className="hidden sm:grid h-9 w-9 sm:h-10 sm:w-10 place-items-center text-black transition hover:opacity-70"
						aria-label="Favorites"
					>
						<Heart size={20} />
					</button>

					{/* Alerts — hidden on mobile */}
					<button
						type="button"
						onClick={openAlertsPopup}
						className="hidden sm:grid h-9 w-9 sm:h-10 sm:w-10 place-items-center text-black transition hover:opacity-70"
						aria-label="Notifications"
						aria-haspopup="dialog"
						aria-expanded={isAlertsOpen}
						aria-controls={alertsMenuId}
					>
						<Bell size={20} />
					</button>
					{isAlertsOpen && (
						<div
							id={alertsMenuId}
							className="absolute right-0 sm:right-20 lg:right-28 top-14 sm:top-16 z-50 w-[calc(100vw-24px)] sm:w-80 rounded-2xl border border-gray-200 bg-white shadow-xl mx-3 sm:mx-0"
						>
							<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
								<p className="text-sm font-bold text-gray-900">Latest Alerts</p>
								<button
									type="button"
									onClick={() => setIsAlertsOpen(false)}
									className="grid h-8 w-8 place-items-center text-gray-400 hover:text-black sm:hidden"
								>
									<X size={16} />
								</button>
							</div>
							<div className="max-h-72 overflow-y-auto">
								{recentAlerts.length ? (
									recentAlerts.map((alertItem) => (
										<button
											key={alertItem?.id || alertItem?.productId}
											type="button"
											onClick={() =>
												navigate(
													`/listing/${alertItem?.productId || alertItem?.id}`,
												)
											}
											className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
										>
											<p className="line-clamp-1 text-sm font-semibold text-gray-900">
												{alertItem?.title || "New listing"}
											</p>
											<p className="line-clamp-1 text-xs text-gray-500">
												{alertItem?.location?.name ||
													alertItem?.location ||
													"Recently updated"}
											</p>
										</button>
									))
								) : (
									<p className="px-4 py-6 text-sm text-gray-500">
										No alerts available
									</p>
								)}
							</div>
						</div>
					)}

					{/* Sell button */}
					<button
						type="button"
						onClick={() => navigate("/post-ad")}
						className="flex items-center gap-1.5 rounded-full bg-[#FFF5D1] px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#5C4D00] transition hover:bg-[#FFEAA3]"
					>
						<Plus size={16} />
						<span>Sell</span>
					</button>

					{/* Profile avatar — hidden on smallest mobile; shown from sm+ */}
					<button
						type="button"
						onClick={onProfileAvatarClick}
						className="hidden sm:flex h-9 w-9 lg:ml-5 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 transition-all hover:border-[#FFD600] group shrink-0"
						aria-label="Open profile menu"
						aria-haspopup="menu"
						aria-expanded={isProfileMenuOpen}
						aria-controls={profileMenuId}
					>
						<img
							src={user?.avatar || "https://placehold.co/80x80?text=U"}
							alt={user?.name || "User avatar"}
							className="h-full w-full object-cover group-hover:opacity-90"
						/>
					</button>
					{isProfileMenuOpen && (
						<div
							id={profileMenuId}
							role="menu"
							className="absolute right-0 lg:right-10 sm:right-0 top-14 sm:top-16 z-50 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl mr-3 sm:mr-0"
						>
							<button
								type="button"
								onClick={onProfileDashboardClick}
								role="menuitem"
								className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
							>
								Dashboard
							</button>
							<button
								type="button"
								onClick={onProfileLogoutClick}
								role="menuitem"
								className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
							>
								Logout
							</button>
						</div>
					)}

					{/* Hamburger — visible on < lg */}
					<button
						type="button"
						onClick={() => setIsMobileNavOpen(true)}
						className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center text-black transition hover:opacity-70 lg:hidden"
						aria-label="Open menu"
						aria-controls={mobileNavId}
						aria-expanded={isMobileNavOpen}
					>
						<Menu size={20} />
					</button>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════
			    MOBILE SEARCH BAR (slide-down, < md)
			═══════════════════════════════════════════════════ */}
			{isMobileSearchOpen && (
				<div
					className="border-t border-gray-100 px-3 py-2 md:hidden"
					ref={mobileSearchRef}
				>
					<div className="relative w-full">
						<form
							role="search"
							aria-label="Mobile site search"
							className="flex w-full items-center rounded-full bg-[#F1F1F1] px-4 py-2.5"
							onSubmit={(event) => event.preventDefault()}
						>
							<Search size={18} className="text-gray-500 shrink-0" />
							<input
								value={search}
								onChange={(event) => onSearchInputChange(event.target.value)}
								onKeyDown={onSearchInputKeyDown}
								onFocus={() => {
									setIsSearchFocused(true);
									if (searchSuggestions.length || isSearchingSuggestions) {
										setShowSearchDropdown(true);
									}
								}}
								autoFocus
								role="searchbox"
								aria-label="Search listings"
								aria-expanded={shouldShowDropdown}
								aria-controls="navbar-search-suggestions"
								aria-activedescendant={
									activeSuggestionIndex >= 0
										? `navbar-search-option-${searchSuggestions[activeSuggestionIndex]?.id || searchSuggestions[activeSuggestionIndex]?.productId}`
										: undefined
								}
								autoComplete="off"
								placeholder="Find Cars, Mobile Phones, and more..."
								className="ml-3 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
							/>
						</form>
						<SearchDropdown />
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════
			    SECONDARY NAV BAR (desktop + tablet)
			═══════════════════════════════════════════════════ */}
			<div className="hidden border-t border-gray-100 px-4 lg:px-6 md:block">
				<nav
					aria-label="Primary sections"
					className="flex h-11 items-center gap-4 lg:gap-5 overflow-x-auto whitespace-nowrap text-sm font-semibold text-gray-600 scrollbar-none"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
				>
					<div className="inline-flex items-center gap-2 shrink-0">
						<a
							href="/business-listings"
							className="transition hover:text-black"
						>
							Business Listings
						</a>
						<button
							type="button"
							onClick={() => navigate("/post-business-ad")}
							className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-[#FFD600] hover:text-black shrink-0"
							aria-label="Add business listing"
						>
							<Plus size={14} />
						</button>
					</div>
					<a
						href="/explore?listingType=auction&sort=Auction%20Ending%20Soon"
						className="transition hover:text-black shrink-0"
					>
						Auctions
					</a>
					<a href="/explore" className="transition hover:text-black shrink-0">
						Marketplace
					</a>
					<a
						href="/my-listings"
						className="transition hover:text-black shrink-0"
					>
						My Listings
					</a>
					<a
						href="/categories"
						className="transition hover:text-black shrink-0"
					>
						Categories
					</a>
					<a
						href="/explore?category=Services"
						className="transition hover:text-black shrink-0"
					>
						Services
					</a>
					<a
						href="/explore?sort=Most%20Popular"
						className="transition hover:text-black shrink-0"
					>
						Top Deals
					</a>
					<a
						href="/help-center"
						className="transition hover:text-black shrink-0"
					>
						Help Center
					</a>
					<a href="/compare" className="transition hover:text-black shrink-0">
						Compare
					</a>
				</nav>
			</div>

			{/* ═══════════════════════════════════════════════════
			    MOBILE / TABLET DRAWER (< lg)
			═══════════════════════════════════════════════════ */}
			<Dialog
				open={isMobileNavOpen}
				onClose={setIsMobileNavOpen}
				className="relative z-50 lg:hidden"
			>
				<div className="fixed inset-0 bg-black/40" aria-hidden="true" />
				<div className="fixed inset-0 flex justify-end">
					<Dialog.Panel
						id={mobileNavId}
						className="h-full w-[min(88vw,360px)] overflow-y-auto border-l border-gray-200 bg-white shadow-2xl"
					>
						{/* Drawer header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
							<Dialog.Title className="text-base font-bold text-black">
								Menu
							</Dialog.Title>
							<button
								type="button"
								onClick={() => setIsMobileNavOpen(false)}
								className="grid h-10 w-10 place-items-center rounded-lg text-gray-600 hover:bg-gray-100"
								aria-label="Close menu"
							>
								<X size={18} />
							</button>
						</div>

						<div className="p-4 space-y-4">
							{/* Profile row (mobile — shown when authenticated) */}
							{isAuthenticated && (
								<div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fafafa] p-3">
									<img
										src={user?.avatar || "https://placehold.co/80x80?text=U"}
										alt={user?.name || "User"}
										className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
									/>
									<div className="min-w-0">
										<p className="text-sm font-bold text-black truncate">
											{user?.name || "User"}
										</p>
										<p className="text-xs text-gray-500 truncate">
											{user?.email || ""}
										</p>
									</div>
								</div>
							)}

							{/* Location picker */}
							<div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-3">
								<p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500 mb-2">
									Location
								</p>
								<LocationPicker
									locationInput={locationInput}
									setLocationInput={(v) => {
										setLocationInput(v);
										setSelectedCoordinates({ lat: null, lng: null });
										sessionStorage.removeItem("selectedLocationCoords");
									}}
									mapsReady={mapsReady}
									mapsFailed={mapsFailed}
									isDetectingLocation={isDetectingLocation}
									isSavingLocation={isSavingLocation}
									autocompleteContainerRef={mobileAutocompleteContainerRef}
									onUseCurrentLocation={useCurrentLocation}
									onSave={() =>
										persistLocation(() => setIsMobileNavOpen(false))
									}
									onClose={null}
								/>
							</div>

							{/* Quick actions */}
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										navigate("/post-ad");
										setIsMobileNavOpen(false);
									}}
									className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FFF5D1] px-3 py-2.5 text-sm font-bold text-[#5C4D00]"
								>
									<Plus size={16} />
									Post Ad
								</button>
								<button
									type="button"
									onClick={() => {
										if (redirectUnauthenticatedUser()) return;
										navigate("/messages");
										setIsMobileNavOpen(false);
									}}
									className="relative flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-700"
								>
									<MessageSquare size={16} />
									Messages
									{unreadCount > 0 && (
										<span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
											{unreadCount > 99 ? "99+" : unreadCount}
										</span>
									)}
								</button>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										navigate("/favorites");
										setIsMobileNavOpen(false);
									}}
									className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700"
								>
									<Heart size={16} />
									Favorites
								</button>
								<button
									type="button"
									onClick={() => {
										if (redirectUnauthenticatedUser()) return;
										navigate("/alerts");
										setIsMobileNavOpen(false);
									}}
									className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700"
								>
									<Bell size={16} />
									Alerts
								</button>
							</div>

							{/* Nav links */}
							<nav aria-label="Mobile sections" className="space-y-0.5">
								<p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400 px-3 pb-1 pt-1">
									Browse
								</p>
								{primaryNavItems.map((item) => (
									<button
										key={item.to}
										type="button"
										onClick={() => {
											navigate(item.to);
											setIsMobileNavOpen(false);
										}}
										className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-black"
									>
										{item.label}
									</button>
								))}
							</nav>

							{/* Auth actions */}
							{isAuthenticated ? (
								<div className="pt-2 border-t border-gray-100 space-y-1">
									<button
										type="button"
										onClick={() => {
											navigate(profileDashboardRoute);
											setIsMobileNavOpen(false);
										}}
										className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100"
									>
										Dashboard
									</button>
									<button
										type="button"
										onClick={() => {
											setIsMobileNavOpen(false);
											logout();
											navigate("/login");
										}}
										className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
									>
										Logout
									</button>
								</div>
							) : (
								<div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => {
											navigate("/login");
											setIsMobileNavOpen(false);
										}}
										className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-700"
									>
										Log in
									</button>
									<button
										type="button"
										onClick={() => {
											navigate("/signup");
											setIsMobileNavOpen(false);
										}}
										className="rounded-xl bg-black px-3 py-2.5 text-sm font-bold text-white"
									>
										Sign up
									</button>
								</div>
							)}
						</div>
					</Dialog.Panel>
				</div>
			</Dialog>
		</header>
	);
}
