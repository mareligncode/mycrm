import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
