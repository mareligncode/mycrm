import express from "express";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  toggleArchiveClient,
  addContact,
  removeContact,
  logClientTouchpoint,
  exportClientsCsv,
  importClientsCsv,
} from "../controllers/clientController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";
import { validateObjectIdParam } from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

router.get("/export", exportClientsCsv);
router.post("/import", importClientsCsv);

router.route("/")
  .get(getClients)
  .post(createClient);

router.route("/:id")
  .all(validateObjectIdParam("id"))
  .get(getClientById)
  .put(updateClient)
  .delete(authorize("super_admin", "admin", "manager"), deleteClient);

router.patch("/:id/archive", validateObjectIdParam("id"), toggleArchiveClient);
router.post("/:id/contacts", validateObjectIdParam("id"), addContact);
router.delete("/:id/contacts/:contactId", validateObjectIdParam("id"), validateObjectIdParam("contactId"), removeContact);
router.post("/:id/touchpoints", validateObjectIdParam("id"), logClientTouchpoint);

export default router;
