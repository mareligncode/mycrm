import express from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import invitationRoutes from "./invitationRoutes.js";
import clientRoutes from "./clientRoutes.js";
import projectRoutes from "./projectRoutes.js";
import followUpRoutes from "./followUpRoutes.js";
import activityRoutes from "./activityRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import telegramRoutes from "./telegramRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/invitations", invitationRoutes);
router.use("/clients", clientRoutes);
router.use("/projects", projectRoutes);
router.use("/followups", followUpRoutes);
router.use("/activities", activityRoutes);
router.use("/notifications", notificationRoutes);
router.use("/telegram", telegramRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
