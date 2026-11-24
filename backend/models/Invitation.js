import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },

  role: {
    type: String,
    enum: ["admin", "manager", "sales", "developer", "member"],
    default: "member",
  },

  tokenHash: { type: String, required: true, select: false },

  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "accepted", "expired", "revoked"],
    default: "pending",
  },

  expiresAt: { type: Date, required: true },
  acceptedAt: Date,
}, { timestamps: true });

invitationSchema.index({ email: 1, status: 1 });

export default mongoose.model("Invitation", invitationSchema);
