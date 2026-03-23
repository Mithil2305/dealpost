import { Router } from "express";
import { quickMessage } from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", protect, quickMessage);

export default router;
