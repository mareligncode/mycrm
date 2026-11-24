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
} from "../controllers/clientController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roles.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getClients)
  .post(createClient);

router.route("/:id")
  .get(getClientById)
  .put(updateClient)
  .delete(authorize("super_admin", "admin", "manager"), deleteClient);

router.patch("/:id/archive", toggleArchiveClient);
router.post("/:id/contacts", addContact);
router.delete("/:id/contacts/:contactId", removeContact);

export default router;
