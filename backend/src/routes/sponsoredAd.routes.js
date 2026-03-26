import { Router } from "express";
import {
	createSponsoredAd,
	deleteMySponsoredAd,
	getMySponsoredAds,
	getPublicSponsoredAds,
	updateMySponsoredAd,
} from "../controllers/sponsoredAd.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/public", getPublicSponsoredAds);
router.get("/my", protect, getMySponsoredAds);
router.post("/", protect, createSponsoredAd);
router.patch("/:id", protect, updateMySponsoredAd);
router.delete("/:id", protect, deleteMySponsoredAd);

export default router;
