import { Router } from "express";
import { getPublicConfig } from "../controllers/config.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/public", optionalAuth, getPublicConfig);

export default router;
