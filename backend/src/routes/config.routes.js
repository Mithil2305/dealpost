import { Router } from "express";
import {
	getPublicConfig,
	getFirebaseDiagnostics,
	reverseGeocode,
} from "../controllers/config.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/public", optionalAuth, getPublicConfig);
router.post("/location/reverse-geocode", reverseGeocode);
router.get("/debug/firebase", getFirebaseDiagnostics);

export default router;
