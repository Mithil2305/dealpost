import { Router } from "express";
import {
	createListing,
	deleteListing,
	getListingById,
	getListings,
	getMyListings,
	patchListing,
	updateListing,
} from "../controllers/listing.controller.js";
import { optionalAuth, protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/", optionalAuth, getListings);
router.get("/my", protect, getMyListings);
router.get("/:id", getListingById);
router.post("/", protect, upload.array("images", 6), createListing);
router.put("/:id", protect, upload.array("images", 6), updateListing);
router.patch("/:id", protect, patchListing);
router.delete("/:id", protect, deleteListing);

export default router;
