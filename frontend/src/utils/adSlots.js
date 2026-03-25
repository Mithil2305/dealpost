const AD_STORAGE_KEY = "dealpost:ad-slots";

const FALLBACK_ADS = [
	{
		id: "ad-1",
		title: "Promote Your Listing",
		description:
			"Boost visibility and close deals faster with a featured placement.",
		imageUrl:
			"https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
		targetUrl: "/post-ad",
		isActive: true,
		updatedAt: new Date().toISOString(),
	},
	{
		id: "ad-2",
		title: "Business Verified",
		description: "Get trust badges and better ranking for your store profile.",
		imageUrl:
			"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
		targetUrl: "/business-listings",
		isActive: true,
		updatedAt: new Date().toISOString(),
	},
];

function readStorage() {
	try {
		const raw = localStorage.getItem(AD_STORAGE_KEY);
		if (!raw) {
			return FALLBACK_ADS;
		}
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return FALLBACK_ADS;
		}
		return parsed;
	} catch {
		return FALLBACK_ADS;
	}
}

function writeStorage(items) {
	localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(items));
	window.dispatchEvent(new CustomEvent("dealpost:ad-slots-updated"));
}

export function getAdSlots() {
	if (typeof window === "undefined") {
		return FALLBACK_ADS;
	}
	return readStorage();
}

export function getActiveAdSlots(limit = 2) {
	const slots = getAdSlots().filter((slot) => slot?.isActive);
	return slots.slice(0, limit);
}

export function createAdSlot(payload) {
	const next = {
		id: `ad-${Date.now()}`,
		title: String(payload?.title || "").trim(),
		description: String(payload?.description || "").trim(),
		imageUrl: String(payload?.imageUrl || "").trim(),
		targetUrl: String(payload?.targetUrl || "").trim() || "/",
		isActive: payload?.isActive !== false,
		updatedAt: new Date().toISOString(),
	};
	const updated = [next, ...getAdSlots()];
	writeStorage(updated);
	return next;
}

export function updateAdSlot(id, payload) {
	const updated = getAdSlots().map((slot) => {
		if (slot.id !== id) return slot;
		const title = payload?.title ?? slot.title ?? "";
		const description = payload?.description ?? slot.description ?? "";
		const imageUrl = payload?.imageUrl ?? slot.imageUrl ?? "";
		const targetUrl = payload?.targetUrl ?? slot.targetUrl ?? "";
		return {
			...slot,
			...payload,
			title: String(title).trim(),
			description: String(description).trim(),
			imageUrl: String(imageUrl).trim(),
			targetUrl: String(targetUrl).trim() || "/",
			updatedAt: new Date().toISOString(),
		};
	});
	writeStorage(updated);
}

export function removeAdSlot(id) {
	const updated = getAdSlots().filter((slot) => slot.id !== id);
	writeStorage(updated);
}
