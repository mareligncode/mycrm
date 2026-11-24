import Activity from "../models/Activity.js";

export const logActivity = async ({
  action,
  description,
  performedBy,
  entityType,
  entityId,
  changes = null,
  metadata = null,
}) => {
  try {
    return await Activity.create({
      action,
      description,
      performedBy,
      entityType,
      entityId,
      changes,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
    return null;
  }
};
