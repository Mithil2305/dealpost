const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export function normalizeGstin(value) {
	const normalized = String(value || "")
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "");

	const compactUdyam = normalized.replace(/-/g, "");
	if (/^UDYAM[A-Z]{2}\d{2}\d{7}$/.test(compactUdyam)) {
		return `UDYAM-${compactUdyam.slice(5, 7)}-${compactUdyam.slice(7, 9)}-${compactUdyam.slice(9)}`;
	}

	return normalized;
}

export function isValidMsmeNumber(value) {
	const normalized = normalizeGstin(value);
	return UDYAM_REGEX.test(normalized);
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
	if (isValidMsmeNumber(gstin)) return true;
	if (!GSTIN_REGEX.test(gstin)) return false;
	if (!requireChecksum) return true;
	return hasValidGstinChecksum(gstin);
}
