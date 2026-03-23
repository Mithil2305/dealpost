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

// Public with optional auth (needed for userId=me query param)
router.get("/", optionalAuth, getListings);

// Protected — must be before /:id to avoid "my" being treated as an ID
router.get("/my", protect, getMyListings);

// Public single listing
router.get("/:id", getListingById);

// Protected mutations
router.post("/", protect, upload.array("images", 6), createListing);
router.put("/:id", protect, upload.array("images", 6), updateListing);
router.patch("/:id", protect, patchListing);
router.delete("/:id", protect, deleteListing);

export default router;
