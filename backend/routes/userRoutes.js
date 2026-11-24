import express from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";

const router = express.Router();

router.route("/")
  .get(protect, getUsers);

router.route("/:id")
  .get(protect, getUserById)
  .put(protect, authorize("super_admin", "admin"), updateUser)
  .delete(protect, authorize("super_admin"), deleteUser);

export default router;
