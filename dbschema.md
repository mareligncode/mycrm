

## **1. User Schema**

```
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  phone: String,
  avatar: String,

  role: {
    type: String,
    enum: ["super_admin", "admin", "manager", "sales", "developer", "member"],
    default: "member",
  },

  department: String,

  permissions: [{ type: String }],

  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },

  telegram: {
    chatId: String,
    username: String,
    isConnected: { type: Boolean, default: false },
  },

  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastLogin: Date,
}, { timestamps: true });

export default mongoose.model("User", userSchema);
```

## **2. Invitation Schema**

```
import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },

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

export default mongoose.model("Invitation", invitationSchema);
```

## **3. Client Schema**

```
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
    enum: ["website", "telegram", "linkedin", "facebook", "referral", "direct", "other"],
    default: "other",
  },

  status: {
    type: String,
    enum: ["lead", "prospect", "negotiation", "active", "inactive", "lost"],
    default: "lead",
  },

  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],

  tags: [String],
  description: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  lastContactedAt: Date,
  nextFollowUpAt: Date,

  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

clientSchema.index({ clientName: "text", companyName: "text", email: "text" });
clientSchema.index({ status: 1, assignedTo: 1 });
clientSchema.index({ nextFollowUpAt: 1 });

export default mongoose.model("Client", clientSchema);
```

## **4. Project Schema**

```
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true, trim: true },
  projectCode: { type: String, required: true, unique: true },

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
```

## **5. Follow-up Schema**

This manages client communication, reminders, meetings and follow-up activities.

```
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

  type: {
    type: String,
    enum: ["call", "email", "meeting", "telegram", "visit", "task", "other"],
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

  scheduledAt: { type: Date, required: true },
  completedAt: Date,

  reminderAt: Date,

  description: String,
  outcome: String,
  notes: String,

  nextFollowUpAt: Date,

  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

followUpSchema.index({ assignedTo: 1, scheduledAt: 1, status: 1 });
followUpSchema.index({ reminderAt: 1, reminderSent: 1 });

export default mongoose.model("FollowUp", followUpSchema);
```

## **6. Activity Schema**

This tracks client updates, project changes, communications and team actions.

```
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
```

## **7. Notification Schema**

This supports in-app and Telegram notifications.

```
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
    enum: ["client", "project", "followup", "user"],
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
```

## **8. Telegram Integration Schema**

This stores Telegram bot configuration and team chat connections.

```
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
```

