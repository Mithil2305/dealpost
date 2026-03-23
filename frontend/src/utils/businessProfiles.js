const STORAGE_KEY = "dealpost_business_profiles";

const readProfiles = () => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const getBusinessProfiles = () => {
	return readProfiles();
};

export const saveBusinessProfile = (profile) => {
	if (!profile?.businessName) return;

	const existing = readProfiles();
	const id = profile.id || profile._id || profile.email || profile.businessName;
	const nextProfile = {
		...profile,
		id,
	};

	const filtered = existing.filter(
		(item) => String(item?.id || item?.email) !== String(id),
	);

	localStorage.setItem(STORAGE_KEY, JSON.stringify([nextProfile, ...filtered]));
};
