import express from "express";
import {
  getFollowUps,
  getFollowUpAnalytics,
  getClientProjectPipeline,
  getUpcomingFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  logOutcomeAndAdvance,
  deleteFollowUp,
} from "../controllers/followUpController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIdParam } from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

router.get("/analytics", getFollowUpAnalytics);
router.get("/pipeline", getClientProjectPipeline);
router.get("/upcoming", getUpcomingFollowUps);

router.route("/")
  .get(getFollowUps)
  .post(createFollowUp);

router.route("/:id")
  .all(validateObjectIdParam("id"))
  .get(getFollowUpById)
  .put(updateFollowUp)
  .delete(deleteFollowUp);

router.post("/:id/outcome", validateObjectIdParam("id"), logOutcomeAndAdvance);

export default router;
