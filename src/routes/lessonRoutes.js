import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import * as controller from "../controllers/lessonController.js";

const router = express.Router();


router.get("/public", controller.getPublicLessons);
router.get("/public/featured", controller.getFeaturedLessons);
router.get("/public/top-contributors", controller.getTopContributors);


router.post("/", verifyToken, controller.createLesson);
router.get("/my/all", verifyToken, controller.getMyLessons);
router.patch("/:id", verifyToken, controller.updateLesson);
router.delete("/:id", verifyToken, controller.deleteLesson);
router.post("/:id/like", verifyToken, controller.toggleLike);
router.post("/:id/report", verifyToken, controller.reportLesson);


router.get("/:id", verifyToken, controller.getLessonById);

export default router;
