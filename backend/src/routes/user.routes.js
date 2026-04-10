import { Router } from "express";
import {
	changePassword,
	deactivateMyAccount,
	deleteMyAccount,
	getUserProfile,
	updateProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/:id", getUserProfile);
router.put(
	"/me",
	protect,
	upload.fields([
		{ name: "avatar", maxCount: 1 },
		{ name: "businessBanner", maxCount: 1 },
	]),
	updateProfile,
);
router.put("/me/password", protect, changePassword);
router.patch("/me/deactivate", protect, deactivateMyAccount);
router.delete("/me", protect, deleteMyAccount);

export default router;
