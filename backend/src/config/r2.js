import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.js";

export const r2Enabled =
	Boolean(env.R2_ACCOUNT_ID) &&
	Boolean(env.R2_ACCESS_KEY_ID) &&
	Boolean(env.R2_SECRET_ACCESS_KEY) &&
	Boolean(env.R2_BUCKET);

export const r2Client = r2Enabled
	? new S3Client({
			region: "auto",
			endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.R2_ACCESS_KEY_ID,
				secretAccessKey: env.R2_SECRET_ACCESS_KEY,
			},
		})
	: null;

export function resolveR2PublicBaseUrl() {
	if (env.R2_PUBLIC_BASE_URL) {
		return env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
	}

	if (env.R2_BUCKET && env.R2_ACCOUNT_ID) {
		return `https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
	}

	return "";
}
