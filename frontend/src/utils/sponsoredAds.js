import api from "../api/axios";

const adPreferredKeys = ["ads", "items", "data"];

function pickArray(payload, preferredKeys = adPreferredKeys) {
	if (Array.isArray(payload)) return payload;

	for (const key of preferredKeys) {
		const value = payload?.[key];
		if (Array.isArray(value)) return value;
		if (Array.isArray(value?.data)) return value.data;
	}

	if (Array.isArray(payload?.data)) return payload.data;
	return [];
}

export async function getPublicSponsoredAds(params = {}) {
	const { data } = await api.get("/sponsored-ads/public", { params });
	return {
		ads: pickArray(data),
		googleAdsSnippet: String(data?.googleAdsSnippet || ""),
	};
}

export async function getMySponsoredAds() {
	const { data } = await api.get("/sponsored-ads/my");
	return pickArray(data);
}

export async function createSponsoredAd(payload) {
	const { data } = await api.post("/sponsored-ads", payload);
	return data?.ad;
}

export async function updateSponsoredAd(id, payload) {
	const { data } = await api.patch(`/sponsored-ads/${id}`, payload);
	return data?.ad;
}

export async function deleteSponsoredAd(id) {
	await api.delete(`/sponsored-ads/${id}`);
}

export async function getAdminSponsoredAds(params = {}) {
	const { data } = await api.get("/admin/sponsored-ads", { params });
	return {
		ads: pickArray(data),
		total: Number(data?.total) || 0,
		page: Number(data?.page) || 1,
		pages: Number(data?.pages) || 1,
	};
}

export async function createAdminSponsoredAd(payload) {
	const { data } = await api.post("/admin/sponsored-ads", payload);
	return data?.ad;
}

export async function updateAdminSponsoredAd(id, payload) {
	const { data } = await api.patch(`/admin/sponsored-ads/${id}`, payload);
	return data?.ad;
}

export async function deleteAdminSponsoredAd(id) {
	await api.delete(`/admin/sponsored-ads/${id}`);
}

export async function getAdminGoogleAdsSnippet() {
	const { data } = await api.get("/admin/sponsored-ads/google-snippet");
	return String(data?.googleAdsSnippet || "");
}

export async function saveAdminGoogleAdsSnippet(googleAdsSnippet) {
	const { data } = await api.put("/admin/sponsored-ads/google-snippet", {
		googleAdsSnippet: String(googleAdsSnippet || ""),
	});
	return String(data?.googleAdsSnippet || "");
}
