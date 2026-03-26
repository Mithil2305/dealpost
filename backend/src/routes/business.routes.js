import { Router } from "express";
import { getBusinesses } from "../controllers/business.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", optionalAuth, getBusinesses);

export default router;
