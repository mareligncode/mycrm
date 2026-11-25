import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  title: { type: String, required: true },
  message: { type: String, required: true },

  type: {
    type: String,
    enum: [
      "invitation",
      "new_client",
      "new_deal",
      "deal_update",
      "new_project",
      "project_update",
      "followup_reminder",
      "deadline",
      "task_assigned",
      "system",
    ],
    required: true,
  },

  channels: [{
    type: String,
    enum: ["in_app", "telegram", "email"],
  }],

  entityType: {
    type: String,
    enum: ["client", "deal", "project", "followup", "user"],
  },

  entityId: mongoose.Schema.Types.ObjectId,

  isRead: { type: Boolean, default: false },
  readAt: Date,

  deliveryStatus: {
    in_app: {
      status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    },
    telegram: {
      status: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
      messageId: String,
      sentAt: Date,
      error: String,
    },
    email: {
      status: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    },
  },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
