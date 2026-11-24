import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  title: { type: String, required: true },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },

  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Cadence / Follow-up Level (1 to 5)
  // Level 1: Discovery & Outreach (First touchpoint / Intro)
  // Level 2: Engagement & Value Demo (Pitch, walkthrough, case studies)
  // Level 3: Decision Maker & Proposal (Commercial offer, scope alignment)
  // Level 4: Negotiation & Escalation (Objection handling, manager intervention)
  // Level 5: Final Closing & Win-Back (Closing cadence, contract sign or retention)
  level: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 1,
  },

  // Sequence touchpoint attempt number (e.g. Attempt #1, #2, #3...)
  sequenceAttempt: {
    type: Number,
    default: 1,
    min: 1,
  },

  // Multi-level Escalation Tier
  escalationTier: {
    type: String,
    enum: ["standard", "high_priority", "manager_escalation", "executive_alert"],
    default: "standard",
  },

  type: {
    type: String,
    enum: [
      "call",
      "email",
      "meeting",
      "telegram",
      "whatsapp",
      "demo",
      "proposal_review",
      "visit",
      "task",
      "other",
    ],
    default: "call",
  },

  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "missed", "cancelled"],
    default: "pending",
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },

  // Standard Follow-up Call/Contact Outcome
  outcome: {
    type: String,
    enum: [
      "pending",
      "connected_interested",
      "meeting_scheduled",
      "quote_sent",
      "no_answer_voicemail",
      "gatekeeper_blocked",
      "rescheduled",
      "lost_disqualified",
      "won_converted",
    ],
    default: "pending",
  },
  outcomeNotes: String,

  scheduledAt: { type: Date, required: true },
  completedAt: Date,

  reminderAt: Date,

  description: String,
  notes: String,

  estimatedDealValue: {
    type: Number,
    default: 0,
  },

  nextFollowUpAt: Date,
  nextActionSuggestion: String,

  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

followUpSchema.index({ assignedTo: 1, scheduledAt: 1, status: 1 });
followUpSchema.index({ level: 1, status: 1 });
followUpSchema.index({ escalationTier: 1 });
followUpSchema.index({ outcome: 1 });
followUpSchema.index({ reminderAt: 1, reminderSent: 1 });

export default mongoose.model("FollowUp", followUpSchema);
