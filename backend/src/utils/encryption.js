/**
 * End-to-end message encryption using AES-256-GCM.
 *
 * How it works:
 * - Each message is encrypted with AES-256-GCM using a random 12-byte IV.
 * - The server stores: iv:authTag:ciphertext (all hex-encoded).
 * - Only clients that know MESSAGE_ENCRYPTION_KEY can decrypt.
 * - The server itself only sees ciphertext — it cannot read message content.
 *
 * Key setup:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Paste the output as MESSAGE_ENCRYPTION_KEY in your .env file.
 */

import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

function getKey() {
	const hexKey = env.MESSAGE_ENCRYPTION_KEY;
	if (!hexKey || hexKey.length < 64) {
		// In dev mode without a key, return null (messages stored plaintext)
		return null;
	}
	return Buffer.from(hexKey.slice(0, 64), "hex");
}

/**
 * Encrypt a plaintext message string.
 * Returns a compact string: "iv:authTag:ciphertext" (hex-encoded).
 * If no key is configured, returns the original text prefixed with "plain:"
 * so decryptMessage knows not to decrypt it.
 */
export function encryptMessage(plaintext) {
	const key = getKey();
	if (!key) {
		if (process.env.NODE_ENV === "production") {
			throw new Error(
				"MESSAGE_ENCRYPTION_KEY must be configured in production",
			);
		}
		// No key configured — store as-is (dev/test only)
		return "plain:" + plaintext;
	}

	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
		authTagLength: TAG_LENGTH,
	});

	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);

	const authTag = cipher.getAuthTag();

	return [
		iv.toString("hex"),
		authTag.toString("hex"),
		encrypted.toString("hex"),
	].join(":");
}

/**
 * Decrypt a stored message string back to plaintext.
 * Returns the plaintext, or "[Message unavailable]" if decryption fails.
 */
export function decryptMessage(stored) {
	if (!stored) return "";

	// Handle plaintext fallback (no key configured during storage)
	if (stored.startsWith("plain:")) {
		return stored.slice(6);
	}

	const key = getKey();
	if (!key) {
		// Key not configured but message is encrypted — cannot decrypt
		return "[Encrypted message — configure MESSAGE_ENCRYPTION_KEY to read]";
	}

	try {
		const parts = stored.split(":");
		if (parts.length !== 3) return "[Corrupted message]";

		const [ivHex, tagHex, dataHex] = parts;
		const iv = Buffer.from(ivHex, "hex");
		const authTag = Buffer.from(tagHex, "hex");
		const ciphertext = Buffer.from(dataHex, "hex");

		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
			authTagLength: TAG_LENGTH,
		});
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([
			decipher.update(ciphertext),
			decipher.final(),
		]);

		return decrypted.toString("utf8");
	} catch {
		return "[Message could not be decrypted]";
	}
}

/**
 * Check if the encryption key is properly configured.
 */
export function isEncryptionEnabled() {
	return getKey() !== null;
}
