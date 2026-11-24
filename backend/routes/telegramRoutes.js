import express from "express";
import {
  getTelegramConfig,
  updateTelegramConfig,
  testTelegramConnection,
} from "../controllers/telegramController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";

const router = express.Router();

router.use(protect);
router.use(authorize("super_admin", "admin"));

router.route("/")
  .get(getTelegramConfig)
  .post(updateTelegramConfig);

router.post("/test", testTelegramConnection);

export default router;
