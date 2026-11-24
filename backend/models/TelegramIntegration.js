import mongoose from "mongoose";

const telegramIntegrationSchema = new mongoose.Schema({
  name: { type: String, default: "Main CRM Telegram Bot" },

  botToken: {
    type: String,
    required: true,
    select: false,
  },

  botUsername: String,

  chatId: String,

  chatType: {
    type: String,
    enum: ["private", "group", "supergroup", "channel"],
    default: "group",
  },

  connectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  isActive: { type: Boolean, default: true },

  events: {
    newClient: { type: Boolean, default: true },
    newProject: { type: Boolean, default: true },
    projectDeadline: { type: Boolean, default: true },
    followUpReminder: { type: Boolean, default: true },
    newInvitation: { type: Boolean, default: false },
    projectCompleted: { type: Boolean, default: true },
  },
}, { timestamps: true });

export default mongoose.model("TelegramIntegration", telegramIntegrationSchema);
