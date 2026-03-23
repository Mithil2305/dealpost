import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "../config/env.js";
import { r2Client, r2Enabled, resolveR2PublicBaseUrl } from "../config/r2.js";

function resolveExtensionFromMime(mimeType) {
	if (mimeType === "image/jpeg") return "jpg";
	if (mimeType === "image/png") return "png";
	if (mimeType === "image/gif") return "gif";
	if (mimeType === "image/svg+xml") return "svg";
	if (mimeType === "image/webp") return "webp";
	return "bin";
}

function sanitizeFolder(folder) {
	return String(folder || "dealpost/uploads")
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
}

async function compressImage(file) {
	const mimeType = file?.mimetype || "application/octet-stream";

	if (mimeType === "image/svg+xml" || mimeType === "image/gif") {
		return {
			buffer: file.buffer,
			contentType: mimeType,
			extension: resolveExtensionFromMime(mimeType),
		};
	}

	try {
		const buffer = await sharp(file.buffer)
			.rotate()
			.resize({
				width: env.IMAGE_MAX_WIDTH,
				height: env.IMAGE_MAX_HEIGHT,
				fit: "inside",
				withoutEnlargement: true,
			})
			.webp({
				quality: env.IMAGE_WEBP_QUALITY,
			})
			.toBuffer();

		return {
			buffer,
			contentType: "image/webp",
			extension: "webp",
		};
	} catch {
		return {
			buffer: file.buffer,
			contentType: mimeType,
			extension: resolveExtensionFromMime(mimeType),
		};
	}
}

export async function uploadToR2(file, folder = "dealpost/listings") {
	if (!file?.buffer) {
		throw new Error("Invalid file upload payload");
	}

	if (!r2Enabled || !r2Client) {
		return {
			url: "https://placehold.co/1200x800?text=DealPost",
			public_id: `local-${Date.now()}`,
		};
	}

	const compressed = await compressImage(file);
	const key = `${sanitizeFolder(folder)}/${Date.now()}-${randomUUID()}.${compressed.extension}`;

	await r2Client.send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET,
			Key: key,
			Body: compressed.buffer,
			ContentType: compressed.contentType,
			CacheControl: "public, max-age=31536000, immutable",
		}),
	);

	const baseUrl = resolveR2PublicBaseUrl();
	const url = baseUrl ? `${baseUrl}/${key}` : key;

	return {
		url,
		public_id: key,
	};
}
