import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getPublicConfig = asyncHandler(async (req, res) => {
	res.json({
		googleMapsBrowserApiKey: req.user
			? env.GOOGLE_MAPS_BROWSER_API_KEY || ""
			: "",
	});
});
