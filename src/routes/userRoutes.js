
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { updateProfileStats, updateProfile } from "../controllers/userController.js";

const router = express.Router();


router.get("/me", verifyToken, updateProfileStats);


router.patch("/me", verifyToken, updateProfile);

export default router;

