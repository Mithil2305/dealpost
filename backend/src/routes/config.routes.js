import { Router } from "express";
import {
	getPublicConfig,
	getFirebaseDiagnostics,
} from "../controllers/config.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/public", optionalAuth, getPublicConfig);
router.get("/debug/firebase", getFirebaseDiagnostics);

export default router;
