import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { getMe } from "../controllers/authController.js";

const router = express.Router();

router.get("/me", verifyToken, getMe);

export default router;