import express from "express";
import {
  getDeals,
  getDealAnalytics,
  getDealById,
  createDeal,
  updateDeal,
  moveDealStage,
  deleteDeal,
  exportDealsCsv,
} from "../controllers/dealController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";
import { validateObjectIdParam } from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

router.get("/analytics", getDealAnalytics);
router.get("/export", exportDealsCsv);

router.route("/")
  .get(getDeals)
  .post(createDeal);

router.route("/:id")
  .all(validateObjectIdParam("id"))
  .get(getDealById)
  .put(updateDeal)
  .delete(authorize("super_admin", "admin", "manager"), deleteDeal);

router.patch("/:id/stage", validateObjectIdParam("id"), moveDealStage);

export default router;
