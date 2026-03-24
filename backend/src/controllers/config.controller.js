import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getPublicConfig = asyncHandler(async (_req, res) => {
	res.json({
		googleMapsBrowserApiKey: env.GOOGLE_MAPS_BROWSER_API_KEY || "",
	});
});
