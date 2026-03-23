import dotenv from "dotenv";

dotenv.config();

function getNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
	PORT: getNumber(process.env.PORT, 5000),
	CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
	DB_HOST: process.env.DB_HOST || "127.0.0.1",
	DB_PORT: getNumber(process.env.DB_PORT, 3306),
	DB_NAME: process.env.DB_NAME || "dealpost",
	DB_USER: process.env.DB_USER || "root",
	DB_PASSWORD: process.env.DB_PASSWORD || "",
	JWT_SECRET: process.env.JWT_SECRET || "dev_change_me",
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
	R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
	R2_BUCKET: process.env.R2_BUCKET,
	R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
	IMAGE_MAX_WIDTH: getNumber(process.env.IMAGE_MAX_WIDTH, 1920),
	IMAGE_MAX_HEIGHT: getNumber(process.env.IMAGE_MAX_HEIGHT, 1920),
	IMAGE_WEBP_QUALITY: getNumber(process.env.IMAGE_WEBP_QUALITY, 75),
};
