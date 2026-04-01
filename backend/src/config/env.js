import dotenv from "dotenv";

dotenv.config();

function getNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function requireEnv(key) {
	const value = process.env[key];
	if (value === undefined || value === null || String(value).trim() === "") {
		throw new Error(
			`FATAL: Required environment variable \"${key}\" is not set.`,
		);
	}
	return String(value);
}

export const env = {
	NODE_ENV: process.env.NODE_ENV || "development",
	PORT: getNumber(process.env.PORT, 5000),
	CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

	// Database — these MUST be set in .env
	DB_HOST: process.env.DB_HOST || "127.0.0.1",
	DB_PORT: getNumber(process.env.DB_PORT, 3306),
	DB_NAME: process.env.DB_NAME || "dealpost",
	DB_USER: requireEnv("DB_USER"),
	DB_PASSWORD: requireEnv("DB_PASSWORD"),

	// JWT
	JWT_SECRET: requireEnv("JWT_SECRET"),
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

	// Cloudflare R2
	R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
	R2_BUCKET: process.env.R2_BUCKET,
	R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,

	// Image processing
	IMAGE_MAX_WIDTH: getNumber(process.env.IMAGE_MAX_WIDTH, 1920),
	IMAGE_MAX_HEIGHT: getNumber(process.env.IMAGE_MAX_HEIGHT, 1920),
	IMAGE_WEBP_QUALITY: getNumber(process.env.IMAGE_WEBP_QUALITY, 75),

	// Google Maps (browser key should be restricted by referrer in Google Cloud)
	GOOGLE_MAPS_BROWSER_API_KEY: process.env.GOOGLE_MAPS_BROWSER_API_KEY || "",
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",

	// Firebase Admin (for verifying Firebase ID tokens server-side)
	FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
	FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
	FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "",

	// E2E message encryption — 64-char hex string (32 bytes)
	// Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	MESSAGE_ENCRYPTION_KEY: process.env.MESSAGE_ENCRYPTION_KEY || "",
};

if (env.NODE_ENV === "production") {
	const origins = String(env.CLIENT_URL || "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);

	if (!origins.length) {
		throw new Error(
			"FATAL: CLIENT_URL must contain at least one allowed origin in production.",
		);
	}

	const invalidOrigins = origins.filter(
		(origin) => !/^https?:\/\//i.test(origin),
	);
	if (invalidOrigins.length) {
		throw new Error(
			`FATAL: CLIENT_URL contains invalid origin(s): ${invalidOrigins.join(", ")}`,
		);
	}
}
