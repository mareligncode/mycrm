import express from "express";
import {
  getFollowUps,
  getFollowUpAnalytics,
  getUpcomingFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  logOutcomeAndAdvance,
  deleteFollowUp,
} from "../controllers/followUpController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/analytics", getFollowUpAnalytics);
router.get("/upcoming", getUpcomingFollowUps);

router.route("/")
  .get(getFollowUps)
  .post(createFollowUp);

router.route("/:id")
  .get(getFollowUpById)
  .put(updateFollowUp)
  .delete(deleteFollowUp);

router.post("/:id/outcome", logOutcomeAndAdvance);

export default router;
