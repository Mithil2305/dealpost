import {
	Bell,
	ChevronDown,
	Crosshair,
	MapPin,
	MessageSquare,
	Search,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import { loadGoogleMapsPlaces } from "../utils/googleMaps";

function getReadableLocationLabel(placeLike) {
	if (!placeLike) return "";

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
				<MapPin size={16} className="text-black" fill="black" />
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
	const [isSavingLocation, setIsSavingLocation] = useState(false);
	const [isDetectingLocation, setIsDetectingLocation] = useState(false);
	const [selectedCoordinates, setSelectedCoordinates] = useState(initialCoords);
	const wrapperRef = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => {
		let active = true;

		const setupMaps = async () => {
			try {
				const { data } = await api.get("/config/public");
				await loadGoogleMapsPlaces(data?.googleMapsBrowserApiKey || "");
				if (active) setMapsReady(true);
			} catch {
				// Silently ignore if API key is not configured.
			}
		};

		setupMaps();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!isLocationOpen || !mapsReady || !inputRef.current) return;

		const autocomplete = new window.google.maps.places.Autocomplete(
			inputRef.current,
			{
				fields: ["formatted_address", "geometry", "name", "address_components"],
				types: ["geocode"],
			},
		);

		const listener = autocomplete.addListener("place_changed", () => {
			const place = autocomplete.getPlace();
			const nextLocation = getReadableLocationLabel(place) || locationInput;
			const lat = place?.geometry?.location?.lat?.();
			const lng = place?.geometry?.location?.lng?.();

			setLocationInput(nextLocation);
			setSelectedCoordinates({
				lat: Number.isFinite(lat) ? lat : null,
				lng: Number.isFinite(lng) ? lng : null,
			});
		});

		return () => {
			if (listener?.remove) listener.remove();
		};
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
		if (!navigator.geolocation || !window.google?.maps?.Geocoder) return;

		setIsDetectingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;
				setSelectedCoordinates({ lat, lng });

				const geocoder = new window.google.maps.Geocoder();
				geocoder.geocode({ location: { lat, lng } }, (results, status) => {
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
						setLocationInput(label || displayLocation);
					} else {
						setLocationInput(displayLocation);
					}
					setIsDetectingLocation(false);
				});
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
							<MapPin size={16} className="text-[#8B7322]" fill="#8B7322" />
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

								<input
									ref={inputRef}
									value={locationInput}
									onChange={(event) => {
										setLocationInput(event.target.value);
										setSelectedCoordinates({ lat: null, lng: null });
										sessionStorage.removeItem("selectedLocationCoords");
									}}
									placeholder={
										mapsReady
											? "Search for area, city, or address"
											: "Type your location"
									}
									className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#FFD600]"
								/>

								<div className="mt-2 flex items-center justify-between">
									<button
										type="button"
										disabled={!mapsReady || isDetectingLocation}
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
						className="text-black transition hover:opacity-70"
						aria-label="Messages"
					>
						<MessageSquare size={22} fill="black" />
					</button>

					<button
						type="button"
						className="text-black transition hover:opacity-70"
						aria-label="Notifications"
					>
						<Bell size={22} fill="black" />
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
