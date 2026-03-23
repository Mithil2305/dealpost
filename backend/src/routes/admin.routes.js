import { Router } from "express";
import {
	adminDeleteListing,
	banUser,
	createReport,
	getAllListings,
	getAllUsers,
	getDashboardStats,
	getReports,
	toggleUserStatus,
	updateListingStatus,
} from "../controllers/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";

const router = Router();

router.use(protect);
router.post("/reports", createReport);

router.use(requireAdmin);
router.get("/stats", getDashboardStats);
router.get("/reports", getReports);
router.get("/users", getAllUsers);
router.patch("/users/:id/status", toggleUserStatus);
router.post("/users/:id/ban", banUser);
router.get("/listings", getAllListings);
router.patch("/listings/:id/status", updateListingStatus);
router.delete("/listings/:id", adminDeleteListing);

export default router;
