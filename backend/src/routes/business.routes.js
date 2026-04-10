import { Router } from "express";
import {
	createBusiness,
	deleteBusiness,
	getBusinesses,
	getMyBusinesses,
	updateBusiness,
} from "../controllers/business.controller.js";
import { optionalAuth, protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/", optionalAuth, getBusinesses);
router.get("/mine", protect, getMyBusinesses);
router.post(
	"/",
	protect,
	upload.fields([
		{ name: "businessLogo", maxCount: 1 },
		{ name: "businessBanner", maxCount: 1 },
	]),
	createBusiness,
);
router.put(
	"/:id",
	protect,
	upload.fields([
		{ name: "businessLogo", maxCount: 1 },
		{ name: "businessBanner", maxCount: 1 },
	]),
	updateBusiness,
);
router.delete("/:id", protect, deleteBusiness);

export default router;
