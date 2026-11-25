import Invitation from "../models/Invitation.js";
import User from "../models/User.js";
import { generateRandomToken, hashToken, generateToken } from "../utils/token.js";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";
import { sendEmail, isEmailConfigured } from "../utils/emailService.js";
import { isValidEmail } from "../middleware/validate.js";

// @desc    Create and send an invitation
// @route   POST /api/invitations
// @access  Private (admin, super_admin, manager)
export const createInvitation = async (req, res, next) => {
  try {
    const { email, role = "member" } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "A user with this email already exists" });
    }

    // Check if there is an active pending invitation
    const activeInvitation = await Invitation.findOne({
      email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (activeInvitation) {
      return res.status(400).json({
        success: false,
        message: "An active invitation for this email already exists",
      });
    }

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await Invitation.create({
      email,
      role,
      tokenHash,
      invitedBy: req.user._id,
      status: "pending",
      expiresAt,
    });

    await logActivity({
      action: "create_invitation",
      description: `Invitation sent to ${email} with role ${role} by ${req.user.email}`,
      performedBy: req.user._id,
      entityType: "invitation",
      entityId: invitation._id,
    });

    // Telegram notification if configured
    if (await shouldDispatchTelegramEvent("newInvitation")) {
      await sendTelegramMessage(
        `✉️ *New Invitation Sent*\n\n*To:* ${email}\n*Role:* ${role}\n*Invited By:* ${req.user.firstName} ${req.user.lastName}`
      );
    }

    const invitationUrl = `/accept-invitation?token=${rawToken}&email=${encodeURIComponent(email)}`;
    const appBaseUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    const fullInviteLink = appBaseUrl ? `${appBaseUrl}${invitationUrl}` : invitationUrl;

    let emailResult = { success: false, reason: "Email transport not configured" };
    if (isEmailConfigured()) {
      emailResult = await sendEmail({
        to: email,
        subject: "You are invited to join the CRM Workspace",
        text: `Hello,\n\n${req.user.firstName} ${req.user.lastName} invited you to join the CRM as "${role}".\n\nComplete your setup here: ${fullInviteLink}\n\nThis invitation expires on ${expiresAt.toUTCString()}.`,
      });
    }

    res.status(201).json({
      success: true,
      message: emailResult.success
        ? "Invitation created and emailed successfully"
        : "Invitation created successfully",
      data: {
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        invitationToken: rawToken,
        invitationUrl,
        emailSent: emailResult.success,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invitations
// @route   GET /api/invitations
// @access  Private (admin, super_admin, manager)
export const getInvitations = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Invitation.countDocuments(query);
    const invitations = await Invitation.find(query)
      .populate("invitedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: invitations.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke an invitation
// @route   PUT /api/invitations/:id/revoke
// @access  Private (admin, super_admin)
export const revokeInvitation = async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot revoke invitation with status: ${invitation.status}`,
      });
    }

    invitation.status = "revoked";
    await invitation.save();

    await logActivity({
      action: "revoke_invitation",
      description: `Invitation to ${invitation.email} was revoked`,
      performedBy: req.user._id,
      entityType: "invitation",
      entityId: invitation._id,
    });

    res.status(200).json({ success: true, message: "Invitation revoked", data: invitation });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify invitation token (Public)
// @route   GET /api/invitations/verify/:token
// @access  Public
export const verifyInvitation = async (req, res, next) => {
  try {
    let rawToken = req.params.token || req.query.token;
    if (!rawToken) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }
    // Handle cases where full URL was passed
    if (rawToken.includes("token=")) {
      rawToken = rawToken.split("token=")[1].split("&")[0];
    }
    const tokenHash = hashToken(rawToken);
    const invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("invitedBy", "firstName lastName");

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invitation token",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept invitation and complete user registration (Public)
// @route   POST /api/invitations/accept
// @access  Public
export const acceptInvitation = async (req, res, next) => {
  try {
    let { token, firstName, lastName, password, phone } = req.body;

    if (!token || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, first name, last name, and password are required",
      });
    }

    if (token.includes("token=")) {
      token = token.split("token=")[1].split("&")[0];
    }

    const tokenHash = hashToken(token);
    const invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "Invalid, expired, or already used invitation token",
      });
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with this email" });
    }

    const user = await User.create({
      firstName,
      lastName,
      email: invitation.email,
      password,
      phone,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      status: "active",
      lastLogin: new Date(),
    });

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    await logActivity({
      action: "accept_invitation",
      description: `${user.firstName} ${user.lastName} accepted invitation and joined as ${user.role}`,
      performedBy: user._id,
      entityType: "user",
      entityId: user._id,
    });

    await createNotification({
      recipient: invitation.invitedBy,
      title: "Invitation Accepted",
      message: `${user.firstName} ${user.lastName} has accepted your invitation.`,
      type: "invitation",
      channels: ["in_app"],
      entityType: "user",
      entityId: user._id,
    });

    const jwtToken = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: jwtToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
