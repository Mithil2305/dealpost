import api from "../api/axios";

const toNumericId = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function getListingNumericId(listing) {
	if (!listing) return null;
	return (
		toNumericId(listing?.id) ||
		toNumericId(listing?._id) ||
		toNumericId(listing?.listingId)
	);
}

export function getListingIdentifier(listing) {
	if (!listing) return null;
	return listing?.productId || listing?._id || listing?.id || null;
}

export function getListingLikedCount(listing) {
	const count = Number(
		listing?.likedByCount ?? listing?.likesCount ?? listing?.likedCount ?? 0,
	);
	return Number.isFinite(count) && count > 0 ? count : 0;
}

export function isListingLiked(listing, likedListingIds = []) {
	const listingId = getListingNumericId(listing);
	if (!listingId) return false;
	const likedIdSet = new Set(
		(Array.isArray(likedListingIds) ? likedListingIds : [])
			.map((value) => toNumericId(value))
			.filter(Boolean),
	);
	return likedIdSet.has(listingId);
}

export async function fetchMyLikedListingIds() {
	const { data } = await api.get("/listings/liked/my");
	const rows = Array.isArray(data?.listings) ? data.listings : [];
	return rows
		.map((item) => getListingNumericId(item))
		.filter((id) => Number.isFinite(id) && id > 0);
}

export async function updateListingLikeStatus({ listing, isLiked }) {
	const listingIdentifier = getListingIdentifier(listing);
	if (!listingIdentifier) {
		throw new Error("Listing identifier is missing");
	}

	if (isLiked) {
		const { data } = await api.delete(`/listings/${listingIdentifier}/like`);
		return {
			isLiked: false,
			likedByCount: Number(data?.likedByCount) || 0,
			likedListingIds: Array.isArray(data?.likedListingIds)
				? data.likedListingIds
				: [],
		};
	}

	const { data } = await api.post(`/listings/${listingIdentifier}/like`);
	return {
		isLiked: true,
		likedByCount: Number(data?.likedByCount) || 0,
		likedListingIds: Array.isArray(data?.likedListingIds)
			? data.likedListingIds
			: [],
	};
}
