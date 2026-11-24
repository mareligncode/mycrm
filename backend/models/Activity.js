import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },

  description: String,

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  entityType: {
    type: String,
    enum: ["client", "project", "followup", "user", "invitation"],
    required: true,
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },

  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
