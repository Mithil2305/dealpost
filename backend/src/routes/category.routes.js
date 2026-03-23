import { Router } from "express";
import {
	createCategory,
	getCategories,
} from "../controllers/category.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";

const router = Router();

router.get("/", getCategories);
router.post("/", protect, requireAdmin, createCategory);

export default router;
