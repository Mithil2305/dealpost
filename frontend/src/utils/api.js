export function pickArray(payload, preferredKeys = []) {
	if (Array.isArray(payload)) return payload;

	for (const key of preferredKeys) {
		const value = payload?.[key];
		if (Array.isArray(value)) return value;
		if (Array.isArray(value?.data)) return value.data;
	}

	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload?.results)) return payload.results;

	return [];
}
