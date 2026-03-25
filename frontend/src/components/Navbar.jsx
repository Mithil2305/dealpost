import {
	Bell,
	ChevronDown,
	Crosshair,
	MapPin,
	MessageSquare,
	Search,
	X,
} from "lucide-react";
import { getUnreadConversationCount } from "../utils/messageNotifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import {
	loadGoogleMapsPlaces,
	mountPlaceAutocompleteElement,
} from "../utils/googleMaps";

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
	const { user, setCurrentUser, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const [unreadCount, setUnreadCount] = useState(0);
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
	const wrapperRef = useRef(null);
	const autocompleteContainerRef = useRef(null);

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
		if (!isLocationOpen || !mapsReady || !autocompleteContainerRef.current) {
			return;
		}

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
	}, [isLocationOpen, mapsReady, locationInput]);

	useEffect(() => {
		const onClickOutside = (event) => {
			if (!wrapperRef.current?.contains(event.target)) {
				setIsLocationOpen(false);
			}
		};

		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	const refreshUnreadCount = useCallback(async () => {
		if (!isAuthenticated || !user?.id) {
			setUnreadCount(0);
			return;
		}

		try {
			const { data } = await api.get("/conversations");
			const rows = Array.isArray(data?.conversations) ? data.conversations : [];
			setUnreadCount(getUnreadConversationCount(rows, user.id));
		} catch {
			// Ignore unread badge refresh failures.
		}
	}, [isAuthenticated, user?.id]);

	useEffect(() => {
		if (!isAuthenticated || !user?.id) {
			setUnreadCount(0);
			return;
		}

		refreshUnreadCount();

		const intervalId = window.setInterval(refreshUnreadCount, 7000);
		const onSeenUpdated = () => {
			refreshUnreadCount();
		};

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
			() => {
				setIsDetectingLocation(false);
			},
		);
	};

	return (
		<header className="sticky top-0 z-40 bg-white border-b border-gray-100">
			<div className="flex h-16 w-full items-center px-6">
				{/* Left Section: Logo & Location */}
				<div className="flex items-center gap-8">
					<BrandLogo />

					<div className="relative hidden lg:flex" ref={wrapperRef}>
						<button
							type="button"
							onClick={() => setIsLocationOpen((prev) => !prev)}
							className="cursor-pointer items-center gap-1.5 text-sm flex"
						>
							<MapPin size={16} className="text-[#8B7322]" />
							<span className="font-bold text-black max-w-[180px] truncate">
								{displayLocation}
							</span>
							<ChevronDown size={16} className="text-gray-400" />
						</button>

						{isLocationOpen && (
							<div className="absolute top-9 left-0 z-50 w-[360px] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
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

								{!!locationInput && (
									<p className="mt-2 truncate text-xs text-gray-600">
										Selected: {locationInput}
									</p>
								)}

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

								{!!selectedCoordinates.lat && !!selectedCoordinates.lng && (
									<p className="mt-2 text-[11px] text-gray-500">
										Coordinates captured for radius filtering.
									</p>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Center Section: Search Bar */}
				<div className="mx-8 hidden flex-1 items-center justify-center lg:flex">
					<div className="flex w-full max-w-2xl items-center rounded-full bg-[#F1F1F1] px-4 py-2.5">
						<Search size={18} className="text-gray-500" />
						<input
							value={search}
							onChange={(event) => onSearchChange?.(event.target.value)}
							placeholder="Find Cars, Mobile Phones, and more..."
							className="ml-3 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
						/>
					</div>
				</div>

				{/* Right Section: Actions & Profile */}
				<div className="ml-auto flex items-center gap-6">
					<button
						type="button"
						onClick={() => navigate("/messages")}
						className="relative text-black transition hover:opacity-70"
						aria-label="Messages"
					>
						<MessageSquare size={22} />
						{unreadCount > 0 && (
							<span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white animate-pulse">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						)}
					</button>

					<button
						type="button"
						className="text-black transition hover:opacity-70"
						aria-label="Notifications"
					>
						<Bell size={22} />
					</button>

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

					<Link
						to="/profile"
						className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center transition-all hover:border-[#FFD600] group"
						aria-label="Open profile"
					>
						<img
							src={user?.avatar || "https://placehold.co/80x80?text=U"}
							alt={user?.name || "User avatar"}
							className="h-full w-full object-cover group-hover:opacity-90"
						/>
					</Link>
				</div>
			</div>
		</header>
	);
}
