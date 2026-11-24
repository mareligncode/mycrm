import express from "express";
import {
  createInvitation,
  getInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation,
} from "../controllers/invitationController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";

const router = express.Router();

// Public routes for accepting invitations
router.get("/verify/:token", verifyInvitation);
router.get("/verify", verifyInvitation);
router.post("/accept", acceptInvitation);

// Protected admin routes
router.use(protect);
router.route("/")
  .post(authorize("super_admin", "admin", "manager"), createInvitation)
  .get(authorize("super_admin", "admin", "manager"), getInvitations);

router.put("/:id/revoke", authorize("super_admin", "admin"), revokeInvitation);

export default router;
