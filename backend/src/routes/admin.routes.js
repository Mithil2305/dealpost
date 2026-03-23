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

// All admin routes require authentication
router.use(protect);

// Any authenticated user can file a report
router.post("/reports", createReport);

// Below this point: admin/developer only
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
