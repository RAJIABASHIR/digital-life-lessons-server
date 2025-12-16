import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import * as controller from "../controllers/favoriteController.js";

const router = express.Router();


router.post("/toggle", verifyToken, controller.toggleFavorite);


router.post("/:lessonId/toggle", verifyToken, controller.toggleFavorite);

router.get("/my", verifyToken, controller.getMyFavorites);

export default router;
