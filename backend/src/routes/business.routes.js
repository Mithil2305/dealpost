import { Router } from "express";
import { getBusinesses } from "../controllers/business.controller.js";

const router = Router();

router.get("/", getBusinesses);

export default router;
