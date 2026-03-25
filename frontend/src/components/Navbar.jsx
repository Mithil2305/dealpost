import {
	Bell,
	ChevronDown,
	Crosshair,
	ExternalLink,
	MapPin,
	MessageSquare,
	Search,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import {
	loadGoogleMapsPlaces,
	mountPlaceAutocompleteElement,
} from "../utils/googleMaps";
import { getUnreadConversationCount } from "../utils/messageNotifications";

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
		<Link to="/" className="flex items-center gap-2 text-xl">
			<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD600]">
				<MapPin size={16} className="text-black" />
			</div>
			<div className="text-black">
				<span className="font-bold">Deal.</span>
				<span>Post</span>
			</div>
		</Link>
	);
}

export default function Navbar({ search = "", onSearchChange }) {
	const { user, setCurrentUser, isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();
	const [unreadCount, setUnreadCount] = useState(0);
	const [recentConversations, setRecentConversations] = useState([]);
	const [recentAlerts, setRecentAlerts] = useState([]);
	const [isMessagesOpen, setIsMessagesOpen] = useState(false);
	const [isAlertsOpen, setIsAlertsOpen] = useState(false);
	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
	const [searchSuggestions, setSearchSuggestions] = useState([]);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
	const [showSearchDropdown, setShowSearchDropdown] = useState(false);

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

	const locationWrapperRef = useRef(null);
	const autocompleteContainerRef = useRef(null);
	const actionsRef = useRef(null);
	const searchRef = useRef(null);

	const profileDashboardRoute = useMemo(() => {
		const role = String(user?.role || "")
			.toLowerCase()
			.trim();
		return role === "admin" || role === "developer" ? "/admin" : "/dashboard";
	}, [user?.role]);

	const onProfileAvatarClick = () => {
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

	useEffect(() => {
		let active = true;

		const setupMaps = async () => {
			try {
				const { data } = await api.get("/config/public");
				await loadGoogleMapsPlaces(data?.googleMapsBrowserApiKey || "");
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

	useEffect(() => {
		if (!isLocationOpen || !mapsReady || !autocompleteContainerRef.current)
			return;

		return mountPlaceAutocompleteElement({
			container: autocompleteContainerRef.current,
			placeholder: "Search for area, city, or address",
			onPlaceSelected: (place) => {
				const nextLocation = getReadableLocationLabel(place) || locationInput;
				setLocationInput(nextLocation);
				setSelectedCoordinates({
					lat: Number.isFinite(place.lat) ? place.lat : null,
					lng: Number.isFinite(place.lng) ? place.lng : null,
				});
			},
		});
	}, [isLocationOpen, locationInput, mapsReady]);

	useEffect(() => {
		const onClickOutside = (event) => {
			if (!locationWrapperRef.current?.contains(event.target)) {
				setIsLocationOpen(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

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
			const { data } = await api.get("/listings", {
				params: { limit: 5, sort: "Newest" },
			});
			setRecentAlerts(Array.isArray(data?.listings) ? data.listings : []);
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

	useEffect(() => {
		refreshRecentAlerts();
	}, [refreshRecentAlerts]);

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

	useEffect(() => {
		const onClickOutside = (event) => {
			if (searchRef.current?.contains(event.target)) return;
			setShowSearchDropdown(false);
			setIsSearchFocused(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	useEffect(() => {
		if (!onSearchChange) return;

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
	}, [isSearchFocused, onSearchChange, search]);

	const persistLocation = async () => {
		const next = locationInput.trim();
		if (!next) return;

		setIsSavingLocation(true);
		setDisplayLocation(next);
		localStorage.setItem("selectedLocation", next);

		if (
			Number.isFinite(selectedCoordinates.lat) &&
			Number.isFinite(selectedCoordinates.lng)
		) {
			sessionStorage.setItem(
				"selectedLocationCoords",
				JSON.stringify({
					lat: selectedCoordinates.lat,
					lng: selectedCoordinates.lng,
				}),
			);
		} else {
			sessionStorage.removeItem("selectedLocationCoords");
		}

		window.dispatchEvent(
			new CustomEvent("dealpost:location-changed", {
				detail: {
					location: next,
					lat: selectedCoordinates.lat,
					lng: selectedCoordinates.lng,
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
	};

	const useCurrentLocation = () => {
		if (!navigator.geolocation) return;

		setIsDetectingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;
				setSelectedCoordinates({ lat, lng });

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
			() => setIsDetectingLocation(false),
		);
	};

	const onSearchInputChange = (value) => {
		onSearchChange?.(value);
		setIsSearchFocused(true);
		if (String(value || "").trim().length < 2) {
			setShowSearchDropdown(false);
		}
	};

	const shouldShowDropdown =
		showSearchDropdown &&
		isSearchFocused &&
		(searchSuggestions.length > 0 || isSearchingSuggestions);

	const openMessagesPopup = () => {
		setIsMessagesOpen((prev) => !prev);
		setIsAlertsOpen(false);
		setIsProfileMenuOpen(false);
	};

	const openAlertsPopup = () => {
		setIsAlertsOpen((prev) => !prev);
		setIsMessagesOpen(false);
		setIsProfileMenuOpen(false);
	};

	const onMessagesPageClick = () => {
		setIsMessagesOpen(false);
		navigate("/messages");
	};

	return (
		<header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
			<div className="flex h-16 w-full items-center px-6">
				<div className="flex items-center gap-8">
					<BrandLogo />

					<div className="relative hidden lg:flex" ref={locationWrapperRef}>
						<button
							type="button"
							onClick={() => setIsLocationOpen((prev) => !prev)}
							className="flex cursor-pointer items-center gap-1.5 text-sm"
						>
							<MapPin size={16} className="text-[#8B7322]" />
							<span className="max-w-[180px] truncate font-bold text-black">
								{displayLocation}
							</span>
							<ChevronDown size={16} className="text-gray-400" />
						</button>
						{isLocationOpen && (
							<div className="absolute left-0 top-9 z-50 w-[360px] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
								<div className="mb-2 flex items-center justify-between">
									<p className="text-sm font-bold text-black">
										Change Location
									</p>
									<button
										type="button"
										onClick={() => setIsLocationOpen(false)}
										className="text-gray-500 hover:text-black"
									>
										<X size={14} />
									</button>
								</div>
								<div className="rounded-xl border border-gray-200 p-1">
									{mapsReady ? (
										<div ref={autocompleteContainerRef} className="w-full" />
									) : (
										<input
											value={locationInput}
											onChange={(event) => {
												setLocationInput(event.target.value);
												setSelectedCoordinates({ lat: null, lng: null });
												sessionStorage.removeItem("selectedLocationCoords");
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
										onClick={useCurrentLocation}
										className="inline-flex items-center gap-1 rounded-lg bg-[#f6f6f6] px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
									>
										<Crosshair size={13} />
										{isDetectingLocation ? "Detecting..." : "Use current"}
									</button>
									<button
										type="button"
										onClick={persistLocation}
										disabled={!locationInput.trim() || isSavingLocation}
										className="rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-60"
									>
										{isSavingLocation ? "Saving..." : "Save"}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="mx-8 hidden flex-1 items-center justify-center lg:flex">
					<div className="relative w-full max-w-2xl" ref={searchRef}>
						<div className="flex w-full items-center rounded-full bg-[#F1F1F1] px-4 py-2.5">
							<Search size={18} className="text-gray-500" />
							<input
								value={search}
								onChange={(event) => onSearchInputChange(event.target.value)}
								onFocus={() => {
									setIsSearchFocused(true);
									if (searchSuggestions.length || isSearchingSuggestions) {
										setShowSearchDropdown(true);
									}
								}}
								placeholder="Find Cars, Mobile Phones, and more..."
								className="ml-3 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
							/>
						</div>
						{shouldShowDropdown && (
							<div className="absolute top-12 z-50 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
								{isSearchingSuggestions ? (
									<p className="px-4 py-3 text-sm text-gray-500">
										Searching...
									</p>
								) : (
									<>
										{searchSuggestions.map((item) => (
											<button
												key={item?.id || item?.productId}
												type="button"
												onClick={() =>
													navigate(`/listing/${item?.productId || item?.id}`)
												}
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
						)}
					</div>
				</div>

				<div className="ml-auto flex items-center gap-6" ref={actionsRef}>
					<button
						type="button"
						onClick={openMessagesPopup}
						className="relative text-black transition hover:opacity-70"
						aria-label="Messages"
					>
						<MessageSquare size={22} />
						{unreadCount > 0 && (
							<span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						)}
					</button>
					{isMessagesOpen && (
						<div className="absolute right-44 top-14 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl">
							<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
								<p className="text-sm font-bold text-gray-900">
									Recent Messages
								</p>
							</div>
							<div className="max-h-80 overflow-y-auto">
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
									View All Messsages
								</button>
							</div>
						</div>
					)}

					<button
						type="button"
						onClick={openAlertsPopup}
						className="text-black transition hover:opacity-70"
						aria-label="Notifications"
					>
						<Bell size={22} />
					</button>
					{isAlertsOpen && (
						<div className="absolute right-28 top-14 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl">
							<div className="border-b border-gray-100 px-4 py-3">
								<p className="text-sm font-bold text-gray-900">Latest Alerts</p>
							</div>
							<div className="max-h-80 overflow-y-auto">
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

					<button
						type="button"
						onClick={() => navigate("/business-listings")}
						className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-[#FFD600] hover:text-black lg:inline-flex"
					>
						Businesses
					</button>
					<button
						type="button"
						onClick={() => navigate("/post-ad")}
						className="hidden rounded-full bg-[#FFF5D1] px-5 py-2 text-sm font-bold text-[#5C4D00] transition hover:bg-[#FFEAA3] sm:inline-flex"
					>
						START LISTING
					</button>
					<button
						type="button"
						onClick={onProfileAvatarClick}
						className="group flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 transition-all hover:border-[#FFD600]"
						aria-label="Open profile menu"
					>
						<img
							src={user?.avatar || "https://placehold.co/80x80?text=U"}
							alt={user?.name || "User avatar"}
							className="h-full w-full object-cover group-hover:opacity-90"
						/>
					</button>
					{isProfileMenuOpen && (
						<div className="absolute right-0 top-14 z-50 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
							<button
								type="button"
								onClick={onProfileDashboardClick}
								className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
							>
								Dashboard
							</button>
							<button
								type="button"
								onClick={onProfileLogoutClick}
								className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
							>
								Logout
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
