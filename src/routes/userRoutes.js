
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { updateProfileStats, updateProfile, getUserRole, getDashboardStats } from "../controllers/userController.js";

const router = express.Router();


router.get("/me", verifyToken, updateProfileStats);


router.patch("/me", verifyToken, updateProfile);

router.get("/:email/role", verifyToken, getUserRole);

router.get("/:email/role", verifyToken, getUserRole);
router.get("/stats/dashboard", verifyToken, getDashboardStats);

export default router;

