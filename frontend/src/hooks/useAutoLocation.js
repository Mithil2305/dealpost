import { useEffect, useRef } from "react";
import {
	getStoredLocationCoords,
	persistStoredLocation,
	reverseGeocodeLocation,
	hasValidCoordinates,
} from "../utils/locationHelpers.js";
import api from "../api/axios.js";

const STORAGE_AUTO_LOCATION_KEY = "autoLocationFetched";
const STORAGE_AUTO_LOCATION_TIMESTAMP_KEY = "autoLocationTimestamp";
const AUTO_LOCATION_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function shouldAutoFetchLocation() {
	const existingCoords = getStoredLocationCoords();
	if (hasValidCoordinates(existingCoords.lat, existingCoords.lng)) {
		return false;
	}

	const alreadyFetched = sessionStorage.getItem(STORAGE_AUTO_LOCATION_KEY);
	if (alreadyFetched === "true") {
		return false;
	}

	const lastFetchTimestamp = localStorage.getItem(
		STORAGE_AUTO_LOCATION_TIMESTAMP_KEY,
	);
	if (lastFetchTimestamp) {
		const lastFetch = parseInt(lastFetchTimestamp, 10);
		const now = Date.now();
		if (now - lastFetch < AUTO_LOCATION_COOLDOWN_MS) {
			return false;
		}
	}

	return true;
}

function markAutoLocationFetched() {
	sessionStorage.setItem(STORAGE_AUTO_LOCATION_KEY, "true");
	localStorage.setItem(STORAGE_AUTO_LOCATION_TIMESTAMP_KEY, String(Date.now()));
}

export function useAutoLocation({ isAuthenticated = false, setCurrentUser = null } = {}) {
	const isFetchingRef = useRef(false);
	const timeoutRef = useRef(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!navigator.geolocation) return;

		if (navigator.permissions && navigator.permissions.query) {
			navigator.permissions.query({ name: 'geolocation' }).then((result) => {
				if (result.state === 'denied') return;
				attemptLocationFetch();
			}).catch(() => {
				attemptLocationFetch();
			});
		} else {
			attemptLocationFetch();
		}

		function attemptLocationFetch() {
			const shouldFetch = shouldAutoFetchLocation();
			if (!shouldFetch) return;

			if (isFetchingRef.current) return;
			isFetchingRef.current = true;

			timeoutRef.current = setTimeout(() => {
				navigator.geolocation.getCurrentPosition(
					async (position) => {
						try {
							const lat = position.coords.latitude;
							const lng = position.coords.longitude;

							if (!hasValidCoordinates(lat, lng)) return;

							const locationData = await reverseGeocodeLocation({
								lat,
								lng,
							});

							if (locationData?.displayAddress) {
								persistStoredLocation({
									lat,
									lng,
									displayAddress: locationData.displayAddress,
									formattedAddress: locationData.formattedAddress,
									area: locationData.area,
									city: locationData.city,
									state: locationData.state,
									pincode: locationData.pincode,
									street: locationData.street,
									placeId: locationData.placeId,
								});

								markAutoLocationFetched();

								// Save to database if user is authenticated
								if (isAuthenticated) {
									try {
										const { data } = await api.put("/users/me", {
											location: locationData.displayAddress,
										});
										if (setCurrentUser && data?.user) {
											setCurrentUser(data.user);
										}
									} catch {
										// Silently fail - local storage already has the location
									}
								}
							}
						} catch {
							// Silently fail
						}
					},
					() => {
						// Permission denied - silently fail
					},
					{
						enableHighAccuracy: false,
						timeout: 15000,
						maximumAge: 300000,
					},
				);
			}, 500);
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [isAuthenticated, setCurrentUser]);
}

export default useAutoLocation;
