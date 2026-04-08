import {
	CalendarDays,
	Camera,
	Edit2,
	MapPin,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import {
	clearStoredLocationCoords,
	fetchOpenStreetSuggestions,
	getStoredLocationCoords,
	getStoredLocationLabel,
	hasValidCoordinates,
	persistStoredLocation,
} from "../utils/locationHelpers";

const isCoordinateLocationString = (value) => {
	const text = String(value || "").trim();
	if (!text) return false;
	return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(text);
};

const getPreferredLocationLabel = (storedLabel, userLocation) => {
	const stored = String(storedLabel || "").trim();
	if (stored && !isCoordinateLocationString(stored)) {
		return stored;
	}

	const fallback = String(userLocation || "").trim();
	if (fallback && !isCoordinateLocationString(fallback)) {
		return fallback;
	}

	return "";
};

export default function Profile({ embedded = false }) {
	const { user, setCurrentUser } = useAuth();
	const fileInputRef = useRef(null);
	const [savingProfile, setSavingProfile] = useState(false);
	const [locationSuggestions, setLocationSuggestions] = useState([]);
	const [locationSearching, setLocationSearching] = useState(false);
	const [verifiedLocation, setVerifiedLocation] = useState(() => {
		const label = getStoredLocationLabel() || user?.location || "";
		const coords = getStoredLocationCoords();
		if (!label || !hasValidCoordinates(coords.lat, coords.lng)) {
			return null;
		}
		return {
			id: "stored",
			label,
			lat: coords.lat,
			lng: coords.lng,
		};
	});
	const [avatarFile, setAvatarFile] = useState(null);
	const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
	const [removeAvatar, setRemoveAvatar] = useState(false);
	const [profileForm, setProfileForm] = useState({
		name: user?.name || "",
		phone: user?.phone || "",
		location: getPreferredLocationLabel(
			getStoredLocationLabel(),
			user?.location,
		),
		businessName: user?.businessName || "",
		gstOrMsme: user?.gstOrMsme || "",
	});

	useEffect(() => {
		const label = getPreferredLocationLabel(
			getStoredLocationLabel(),
			user?.location,
		);
		const coords = getStoredLocationCoords();

		setProfileForm({
			name: user?.name || "",
			phone: user?.phone || "",
			location: label,
			businessName: user?.businessName || "",
			gstOrMsme: user?.gstOrMsme || "",
		});
		if (label && hasValidCoordinates(coords.lat, coords.lng)) {
			setVerifiedLocation({
				id: "stored",
				label,
				lat: coords.lat,
				lng: coords.lng,
			});
		} else {
			setVerifiedLocation(null);
		}
		setLocationSuggestions([]);
		setAvatarFile(null);
		setAvatarPreviewUrl("");
		setRemoveAvatar(false);
	}, [user]);

	useEffect(() => {
		const syncLocationFromNavbar = () => {
			const nextLocation = getStoredLocationLabel();
			if (!nextLocation) return;

			setProfileForm((prev) => ({ ...prev, location: nextLocation }));
			const coords = getStoredLocationCoords();
			if (hasValidCoordinates(coords.lat, coords.lng)) {
				setVerifiedLocation({
					id: "stored",
					label: nextLocation,
					lat: coords.lat,
					lng: coords.lng,
				});
			} else {
				setVerifiedLocation(null);
			}
		};

		window.addEventListener(
			"dealpost:location-changed",
			syncLocationFromNavbar,
		);
		return () => {
			window.removeEventListener(
				"dealpost:location-changed",
				syncLocationFromNavbar,
			);
		};
	}, []);

	useEffect(() => {
		const query = String(profileForm.location || "").trim();
		if (query && query === String(verifiedLocation?.label || "").trim()) {
			setLocationSuggestions([]);
			setLocationSearching(false);
			return;
		}

		if (query.length < 3) {
			setLocationSuggestions([]);
			setLocationSearching(false);
			return;
		}

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				setLocationSearching(true);
				const rows = await fetchOpenStreetSuggestions(query, {
					limit: 6,
					signal: controller.signal,
				});
				setLocationSuggestions(rows);
			} catch (error) {
				if (error?.name !== "AbortError") {
					setLocationSuggestions([]);
				}
			} finally {
				setLocationSearching(false);
			}
		}, 250);

		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [profileForm.location, verifiedLocation]);

	const isBusinessAccount =
		String(user?.accountType || "").toLowerCase() === "business";

	const joinDate = user?.createdAt
		? new Date(user.createdAt).toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			})
		: "Recently";

	const profileLocationLabel =
		getPreferredLocationLabel(getStoredLocationLabel(), user?.location) ||
		"Location not set";

	const onUpdateProfile = async (event) => {
		event.preventDefault();
		if (!profileForm.name.trim()) {
			toast.error("Name is required");
			return;
		}

		const locationText = String(profileForm.location || "").trim();
		if (isCoordinateLocationString(locationText)) {
			toast.error("Choose a valid location from suggestions");
			return;
		}
		if (
			locationText &&
			(!verifiedLocation ||
				locationText !== String(verifiedLocation.label || "").trim() ||
				!hasValidCoordinates(verifiedLocation.lat, verifiedLocation.lng))
		) {
			toast.error("Select a verified location from suggestions");
			return;
		}

		try {
			setSavingProfile(true);
			const payload = new FormData();
			payload.append("name", profileForm.name);
			payload.append("phone", profileForm.phone || "");
			payload.append("location", locationText);

			if (isBusinessAccount) {
				payload.append("businessName", profileForm.businessName || "");
				payload.append("gstOrMsme", profileForm.gstOrMsme || "");
			}

			if (avatarFile) {
				payload.append("avatar", avatarFile);
			}

			if (removeAvatar) {
				payload.append("removeAvatar", "true");
			}

			const { data } = await api.put("/users/me", payload);
			setCurrentUser(data?.user || user);

			if (locationText && verifiedLocation) {
				persistStoredLocation({
					location: locationText,
					lat: verifiedLocation.lat,
					lng: verifiedLocation.lng,
					placeId: verifiedLocation.id,
				});
			} else if (!locationText) {
				persistStoredLocation({ location: "" });
				clearStoredLocationCoords();
			}

			window.dispatchEvent(new Event("dealpost:location-changed"));
			setAvatarFile(null);
			setAvatarPreviewUrl("");
			setRemoveAvatar(false);
			toast.success("Profile updated successfully");
		} catch (error) {
			toast.error(error?.response?.data?.message || "Unable to update profile");
		} finally {
			setSavingProfile(false);
		}
	};

	const selectVerifiedLocation = (suggestion) => {
		if (!suggestion) return;
		setProfileForm((prev) => ({ ...prev, location: suggestion.label || "" }));
		setVerifiedLocation({
			id: String(suggestion.id || ""),
			label: suggestion.label || "",
			lat: Number(suggestion.lat),
			lng: Number(suggestion.lng),
		});
		setLocationSuggestions([]);
	};

	const onAvatarFileChange = (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!String(file.type || "").startsWith("image/")) {
			toast.error("Please choose an image file");
			event.target.value = "";
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image size should be up to 5MB");
			event.target.value = "";
			return;
		}

		if (avatarPreviewUrl) {
			URL.revokeObjectURL(avatarPreviewUrl);
		}

		setAvatarFile(file);
		setAvatarPreviewUrl(URL.createObjectURL(file));
		setRemoveAvatar(false);
		event.target.value = "";
	};

	const onRemoveAvatar = () => {
		if (avatarPreviewUrl) {
			URL.revokeObjectURL(avatarPreviewUrl);
		}
		setAvatarPreviewUrl("");
		setAvatarFile(null);
		setRemoveAvatar(true);
	};

	const resetForm = () => {
		const label = getPreferredLocationLabel(
			getStoredLocationLabel(),
			user?.location,
		);
		const coords = getStoredLocationCoords();

		setProfileForm({
			name: user?.name || "",
			phone: user?.phone || "",
			location: label,
			businessName: user?.businessName || "",
			gstOrMsme: user?.gstOrMsme || "",
		});

		if (label && hasValidCoordinates(coords.lat, coords.lng)) {
			setVerifiedLocation({
				id: "stored",
				label,
				lat: coords.lat,
				lng: coords.lng,
			});
		} else {
			setVerifiedLocation(null);
		}

		if (avatarPreviewUrl) {
			URL.revokeObjectURL(avatarPreviewUrl);
		}
		setAvatarPreviewUrl("");
		setAvatarFile(null);
		setRemoveAvatar(false);
		setLocationSuggestions([]);
	};

	useEffect(() => {
		return () => {
			if (avatarPreviewUrl) {
				URL.revokeObjectURL(avatarPreviewUrl);
			}
		};
	}, [avatarPreviewUrl]);

	const resolvedAvatar =
		avatarPreviewUrl ||
		(removeAvatar
			? `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=random`
			: user?.avatar ||
				`https://ui-avatars.com/api/?name=${user?.name || "User"}&background=random`);

	const profileCard = (
		<div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
			<div className="px-6 md:px-10 pb-8 pt-6 md:pt-8 relative">
				{/* Overlapping Profile Info */}
				<div className="flex flex-col md:flex-row gap-5 md:items-end mb-6">
					<div className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-white shadow-lg bg-gray-100 shrink-0 overflow-hidden relative z-10">
						<img
							src={resolvedAvatar}
							alt={user?.name || "User"}
							className="h-full w-full object-cover"
						/>
					</div>

					<div className="flex-1 pb-2">
						<h1 className="text-3xl md:text-4xl font-display font-black text-black flex items-center gap-3">
							{user?.name || "DealPost User"}
							{(user?.role === "admin" || user?.role === "developer") && (
								<ShieldCheck size={28} className="text-blue-500" />
							)}
						</h1>
						<p className="text-gray-500 font-medium mt-1 text-lg">
							{user?.email}
						</p>

						<div className="flex flex-wrap gap-3 mt-4">
							<span className="bg-[#F5F6F8] text-gray-600 text-sm font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-gray-200">
								<CalendarDays size={16} className="text-gray-400" />
								Joined {joinDate}
							</span>
							<span className="bg-[#F5F6F8] text-gray-600 text-sm font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-gray-200">
								<MapPin size={16} className="text-gray-400" />
								{profileLocationLabel}
							</span>
						</div>
					</div>

					<div className="flex flex-wrap md:flex-col gap-2 md:items-start">
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							onChange={onAvatarFileChange}
							className="hidden"
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
						>
							<Camera size={14} />
							{avatarFile ? "Replace image" : "Change image"}
						</button>
						<button
							type="button"
							onClick={onRemoveAvatar}
							className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
						>
							<Trash2 size={14} />
							Remove image
						</button>
					</div>
				</div>

				<div className="h-px w-full bg-gray-100 mb-6" />

				{/* Edit Form */}
				<form onSubmit={onUpdateProfile}>
					<div className="flex items-center gap-3 mb-6">
						<div className="p-2.5 bg-[#FFF3CD] rounded-xl text-[#b39500]">
							<Edit2 size={20} />
						</div>
						<div>
							<h2 className="text-xl md:text-2xl font-display font-bold text-black">
								Profile Details
							</h2>
							<p className="text-sm text-gray-500 mt-0.5">
								Keep your public account details current.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
						<label className="space-y-2 md:col-span-2">
							<span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
								Full Name
							</span>
							<input
								value={profileForm.name}
								onChange={(event) =>
									setProfileForm((prev) => ({
										...prev,
										name: event.target.value,
									}))
								}
								placeholder="Enter your full name"
								className="h-12 w-full rounded-xl border border-transparent bg-[#F5F6F8] px-4 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFD24D] focus:bg-white focus:ring-4 focus:ring-[#FFD24D]/20"
							/>
						</label>

						<label className="space-y-2">
							<span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
								Phone Number
							</span>
							<input
								value={profileForm.phone}
								onChange={(event) =>
									setProfileForm((prev) => ({
										...prev,
										phone: event.target.value,
									}))
								}
								placeholder="Enter phone number"
								className="h-12 w-full rounded-xl border border-transparent bg-[#F5F6F8] px-4 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFD24D] focus:bg-white focus:ring-4 focus:ring-[#FFD24D]/20"
							/>
						</label>

						<label className="space-y-2">
							<span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
								Location
							</span>
							<div className="relative">
								<input
									value={profileForm.location}
									onChange={(event) => {
										const nextValue = event.target.value;
										setProfileForm((prev) => ({
											...prev,
											location: nextValue,
										}));
										if (
											String(verifiedLocation?.label || "").trim() !==
											String(nextValue || "").trim()
										) {
											setVerifiedLocation(null);
										}
									}}
									onBlur={() => {
										setTimeout(() => setLocationSuggestions([]), 120);
									}}
									placeholder="City or area"
									className="h-12 w-full rounded-xl border border-transparent bg-[#F5F6F8] px-4 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFD24D] focus:bg-white focus:ring-4 focus:ring-[#FFD24D]/20"
								/>
								{(locationSearching || locationSuggestions.length > 0) &&
								profileForm.location.trim().length >= 3 ? (
									<div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
										{locationSearching ? (
											<p className="px-3 py-2 text-xs text-gray-500">
												Searching locations...
											</p>
										) : locationSuggestions.length ? (
											locationSuggestions.map((suggestion) => (
												<button
													key={suggestion.id}
													type="button"
													onMouseDown={() => selectVerifiedLocation(suggestion)}
													className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-700 last:border-b-0 hover:bg-gray-50"
												>
													{suggestion.label}
												</button>
											))
										) : (
											<p className="px-3 py-2 text-xs text-gray-500">
												No verified locations found.
											</p>
										)}
									</div>
								) : null}
							</div>
						</label>
					</div>

					{isBusinessAccount && (
						<div className="mt-6 pt-6 border-t border-gray-100">
							<h3 className="text-lg font-display font-bold text-black mb-5">
								Business Information
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
								<label className="space-y-2">
									<span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
										Business Name
									</span>
									<input
										value={profileForm.businessName}
										onChange={(event) =>
											setProfileForm((prev) => ({
												...prev,
												businessName: event.target.value,
											}))
										}
										placeholder="Business or brand name"
										className="h-12 w-full rounded-xl border border-transparent bg-[#F5F6F8] px-4 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFD24D] focus:bg-white focus:ring-4 focus:ring-[#FFD24D]/20"
									/>
								</label>
								<label className="space-y-2">
									<span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
										GST / MSME
									</span>
									<input
										value={profileForm.gstOrMsme}
										onChange={(event) =>
											setProfileForm((prev) => ({
												...prev,
												gstOrMsme: event.target.value,
											}))
										}
										placeholder="Enter GST / MSME number"
										className="h-12 w-full rounded-xl border border-transparent bg-[#F5F6F8] px-4 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFD24D] focus:bg-white focus:ring-4 focus:ring-[#FFD24D]/20"
									/>
								</label>
							</div>
						</div>
					)}

					{/* Footer Actions */}
					<div className="mt-8 pt-5 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
						<div className="flex w-full sm:w-auto gap-2">
							<button
								type="button"
								onClick={resetForm}
								className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
							>
								Reset
							</button>
							<button
								type="submit"
								disabled={savingProfile}
								className="h-12 rounded-xl bg-black px-8 text-white text-sm font-semibold transition hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center shadow-md shadow-black/10"
							>
								{savingProfile ? "Saving..." : "Save Profile"}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);

	if (embedded) {
		return profileCard;
	}

	return (
		<div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-gray-900">
			<Navbar />

			<main
				id="main-content"
				className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
			>
				{profileCard}
			</main>

			<Footer />
		</div>
	);
}
