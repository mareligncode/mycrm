import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  addAttachment,
} from "../controllers/projectController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getProjects)
  .post(createProject);

router.route("/:id")
  .get(getProjectById)
  .put(updateProject)
  .delete(authorize("super_admin", "admin", "manager"), deleteProject);

router.post("/:id/members", addTeamMember);
router.delete("/:id/members/:userId", removeTeamMember);
router.post("/:id/attachments", addAttachment);

export default router;
