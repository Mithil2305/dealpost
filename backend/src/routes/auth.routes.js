import { Router } from "express";
import {
	firebaseAuth,
	getMe,
	googleAuth,
	login,
	register,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/firebase", firebaseAuth);
router.get("/me", protect, getMe);

export default router;
