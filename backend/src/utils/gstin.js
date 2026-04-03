const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function normalizeGstin(value) {
	return String(value || "")
		.trim()
		.toUpperCase();
}

export function hasValidGstinChecksum(value) {
	const gstin = normalizeGstin(value);
	if (!GSTIN_REGEX.test(gstin)) return false;

	const payload = gstin.slice(0, 14);
	const expectedCheckDigit = gstin[14];

	let factor = 1;
	let sum = 0;

	for (const character of payload) {
		const codePoint = GSTIN_CHARSET.indexOf(character);
		if (codePoint < 0) return false;

		const product = codePoint * factor;
		sum += Math.floor(product / 36) + (product % 36);
		factor = factor === 1 ? 2 : 1;
	}

	const checkCodePoint = (36 - (sum % 36)) % 36;
	const actualCheckDigit = GSTIN_CHARSET[checkCodePoint];

	return actualCheckDigit === expectedCheckDigit;
}

export function isValidGstin(value, options = {}) {
	const { requireChecksum = false } = options;
	const gstin = normalizeGstin(value);
	if (!GSTIN_REGEX.test(gstin)) return false;
	if (!requireChecksum) return true;
	return hasValidGstinChecksum(gstin);
}
