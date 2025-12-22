import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireAdmin } from "../middleware/requireRole.js";
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  getAdminLessons,
  updateLessonAdmin,
  deleteLessonAdmin,
  getReportedLessons,
  getLessonReports,
  getAdminProfile,
  resolveLessonReports 
} from "../controllers/adminController.js";

const router = express.Router();


router.use(verifyToken, requireAdmin);


router.get("/stats", getAdminStats);


router.get("/users", getAdminUsers);
router.patch("/users/:userId/role", updateUserRole);


router.get("/lessons", getAdminLessons);
router.patch("/lessons/:lessonId", updateLessonAdmin);
router.delete("/lessons/:lessonId", deleteLessonAdmin);


router.get("/reports", getReportedLessons);
router.get("/reports/:lessonId", getLessonReports);
router.patch("/reports/:lessonId/resolve", resolveLessonReports); 


router.get("/profile", getAdminProfile);

export default router;