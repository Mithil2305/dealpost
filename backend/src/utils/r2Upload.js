import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { env } from "../config/env.js";
import { r2Client, r2Enabled, resolveR2PublicBaseUrl } from "../config/r2.js";

function resolveExtensionFromMime(mimeType) {
	if (mimeType === "image/jpeg") return "jpg";
	if (mimeType === "image/png") return "png";
	if (mimeType === "image/gif") return "gif";
	if (mimeType === "image/svg+xml") return "svg";
	if (mimeType === "image/webp") return "webp";
	if (mimeType === "image/avif") return "avif";
	return "bin";
}

function sanitizeFolder(folder) {
	return String(folder || "dealpost/uploads")
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
}

const ALLOWED_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"webp",
	"avif",
	"gif",
]);

export async function createR2PresignedUpload({
	folder = "dealpost/listings",
	fileName,
	contentType,
	expiresIn = 900,
}) {
	if (!r2Enabled || !r2Client) {
		throw new Error("R2 is not configured");
	}

	if (!contentType || !String(contentType).startsWith("image/")) {
		throw new Error("Only image uploads are allowed");
	}

	const extension =
		String(fileName || "upload")
			.split(".")
			.pop()
			?.toLowerCase()
			?.replace(/[^a-z0-9]/g, "") || resolveExtensionFromMime(contentType);

	const mimeExtension = resolveExtensionFromMime(contentType);
	const safeExtension = ALLOWED_EXTENSIONS.has(extension)
		? extension
		: ALLOWED_EXTENSIONS.has(mimeExtension)
			? mimeExtension
			: "jpg";
	const key = `${sanitizeFolder(folder)}/${Date.now()}-${randomUUID()}.${safeExtension}`;

	const command = new PutObjectCommand({
		Bucket: env.R2_BUCKET,
		Key: key,
		ContentType: contentType,
		CacheControl: "public, max-age=31536000, immutable",
	});

	const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
	const baseUrl = resolveR2PublicBaseUrl();
	const publicUrl = baseUrl ? `${baseUrl}/${key}` : key;

	return {
		key,
		uploadUrl,
		publicUrl,
		expiresIn,
	};
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
		if (process.env.NODE_ENV === "production") {
			throw new Error("R2 storage is not configured");
		}
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
