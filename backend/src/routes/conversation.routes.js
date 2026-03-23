import { Router } from "express";
import {
	getMessages,
	getMyConversations,
	sendMessage,
	startConversation,
} from "../controllers/conversation.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getMyConversations);
router.post("/", protect, startConversation);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, sendMessage);

export default router;
