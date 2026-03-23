import { Router } from "express";
import {
	changePassword,
	getUserProfile,
	updateProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/:id", getUserProfile);
router.put("/me", protect, upload.single("avatar"), updateProfile);
router.put("/me/password", protect, changePassword);

export default router;
