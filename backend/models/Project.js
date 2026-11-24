import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true, trim: true },
  projectCode: { type: String, required: true, unique: true, uppercase: true, trim: true },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },

  description: String,

  category: {
    type: String,
    enum: ["web", "mobile", "software", "consulting", "design", "other"],
    default: "software",
  },

  status: {
    type: String,
    enum: ["pending", "planning", "in_progress", "on_hold", "completed", "cancelled"],
    default: "pending",
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },

  projectManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  teamMembers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    responsibility: String,
    assignedAt: { type: Date, default: Date.now },
  }],

  startDate: Date,
  deadline: Date,
  completedAt: Date,

  budget: {
    amount: Number,
    currency: { type: String, default: "ETB" },
  },

  progress: { type: Number, default: 0, min: 0, max: 100 },

  attachments: [{
    name: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],

  requirements: [String],
  notes: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ projectManager: 1, deadline: 1 });

export default mongoose.model("Project", projectSchema);
