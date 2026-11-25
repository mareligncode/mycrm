import mongoose from "mongoose";

export const DEAL_STAGES = [
  "qualified",
  "contacted",
  "demo_scheduled",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export const STAGE_DEFAULT_PROBABILITY = {
  qualified: 15,
  contacted: 25,
  demo_scheduled: 45,
  proposal_sent: 65,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

const dealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Deal title is required"],
    trim: true,
  },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: [true, "Associated client is required"],
  },

  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  stage: {
    type: String,
    enum: DEAL_STAGES,
    default: "qualified",
  },

  amount: {
    type: Number,
    default: 0,
    min: 0,
  },

  currency: {
    type: String,
    default: "USD",
    uppercase: true,
    trim: true,
  },

  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 15,
  },

  expectedCloseDate: Date,
  closedAt: Date,
  lossReason: String,

  source: {
    type: String,
    enum: ["website", "telegram", "linkedin", "facebook", "referral", "cold_call", "direct", "other"],
    default: "other",
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },

  tags: [String],
  notes: String,

  position: {
    type: Number,
    default: 0,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

dealSchema.virtual("weightedAmount").get(function () {
  return Math.round(((this.amount || 0) * (this.probability ?? 0)) / 100);
});

dealSchema.index({ stage: 1, owner: 1 });
dealSchema.index({ client: 1, stage: 1 });
dealSchema.index({ expectedCloseDate: 1 });

export default mongoose.model("Deal", dealSchema);
