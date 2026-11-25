import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: String,
  email: String,
  phone: String,
  isPrimary: { type: Boolean, default: false },
});

const clientSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  companyName: String,

  clientType: {
    type: String,
    enum: ["individual", "company", "organization"],
    default: "company",
  },

  email: String,
  phone: String,
  website: String,

  address: {
    country: String,
    city: String,
    subCity: String,
    street: String,
  },

  contacts: [contactSchema],

  industry: String,

  source: {
    type: String,
    enum: ["website", "telegram", "linkedin", "facebook", "referral", "cold_call", "direct", "other"],
    default: "other",
  },

  status: {
    type: String,
    enum: ["lead", "contacted", "prospect", "proposal_sent", "negotiation", "won", "active", "inactive", "lost"],
    default: "lead",
  },

  estimatedValue: {
    type: Number,
    default: 0,
    min: 0,
  },

  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],

  tags: [String],
  description: String,
  notes: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  lastContactedAt: Date,
  nextFollowUpAt: Date,

  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

clientSchema.index({ clientName: "text", companyName: "text", email: "text" });
clientSchema.index({ status: 1, assignedTo: 1 });
clientSchema.index({ nextFollowUpAt: 1 });

export default mongoose.model("Client", clientSchema);
