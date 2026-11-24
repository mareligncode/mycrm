import FollowUp from "../models/FollowUp.js";
import Client from "../models/Client.js";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";

// Helper to compute SLA status
const calculateSlaStatus = (scheduledAt, status) => {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diffHours = (scheduled - now) / (1000 * 60 * 60);

  if (diffHours < -48) return "breached";
  if (diffHours < 0) return "overdue";
  if (diffHours <= 24) return "due_soon";
  return "on_track";
};

// @desc    Get followups with filters, levels, SLA, and pagination
// @route   GET /api/followups
// @access  Private
export const getFollowUps = async (req, res, next) => {
  try {
    const {
      client,
      project,
      assignedTo,
      status,
      type,
      priority,
      level,
      escalationTier,
      outcome,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "scheduledAt",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    if (client) query.client = client;
    if (project) query.project = project;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (level) query.level = parseInt(level, 10);
    if (escalationTier) query.escalationTier = escalationTier;
    if (outcome) query.outcome = outcome;

    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const total = await FollowUp.countDocuments(query);
    const rawFollowUps = await FollowUp.find(query)
      .populate("client", "clientName companyName email phone")
      .populate("project", "projectName projectCode")
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const followUps = rawFollowUps.map((item) => {
      const obj = item.toObject();
      obj.slaStatus = calculateSlaStatus(item.scheduledAt, item.status);
      return obj;
    });

    res.status(200).json({
      success: true,
      count: followUps.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get followups analytics & cadence breakdown
// @route   GET /api/followups/analytics
// @access  Private
export const getFollowUpAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [
      levelStats,
      statusStats,
      escalationStats,
      outcomeStats,
      overdueCount,
      dueTodayCount,
      totalActive,
    ] = await Promise.all([
      // Count by level
      FollowUp.aggregate([
        { $match: { status: { $in: ["pending", "in_progress"] } } },
        { $group: { _id: "$level", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Count by status
      FollowUp.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Count by escalation tier
      FollowUp.aggregate([
        { $match: { status: { $in: ["pending", "in_progress"] } } },
        { $group: { _id: "$escalationTier", count: { $sum: 1 } } },
      ]),
      // Count by outcome
      FollowUp.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$outcome", count: { $sum: 1 } } },
      ]),
      // Overdue
      FollowUp.countDocuments({
        status: { $in: ["pending", "in_progress"] },
        scheduledAt: { $lt: new Date() },
      }),
      // Due Today
      FollowUp.countDocuments({
        status: { $in: ["pending", "in_progress"] },
        scheduledAt: { $gte: todayStart, $lte: todayEnd },
      }),
      // Total Active
      FollowUp.countDocuments({
        status: { $in: ["pending", "in_progress"] },
      }),
    ]);

    // Format level map (levels 1 through 5)
    const levelsMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    levelStats.forEach((l) => {
      if (levelsMap[l._id] !== undefined) {
        levelsMap[l._id] = l.count;
      }
    });

    const escalationsMap = {
      standard: 0,
      high_priority: 0,
      manager_escalation: 0,
      executive_alert: 0,
    };
    escalationStats.forEach((e) => {
      if (escalationsMap[e._id] !== undefined) {
        escalationsMap[e._id] = e.count;
      }
    });

    const outcomesMap = {};
    outcomeStats.forEach((o) => {
      outcomesMap[o._id] = o.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalActive,
        overdueCount,
        dueTodayCount,
        levels: levelsMap,
        escalations: escalationsMap,
        outcomes: outcomesMap,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming follow-ups (next 48h)
// @route   GET /api/followups/upcoming
// @access  Private
export const getUpcomingFollowUps = async (req, res, next) => {
  try {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const followUps = await FollowUp.find({
      status: { $in: ["pending", "in_progress"] },
      scheduledAt: { $gte: now, $lte: in48Hours },
    })
      .populate("client", "clientName companyName email phone")
      .populate("project", "projectName projectCode")
      .populate("assignedTo", "firstName lastName email")
      .sort({ scheduledAt: 1 });

    const enriched = followUps.map((item) => {
      const obj = item.toObject();
      obj.slaStatus = calculateSlaStatus(item.scheduledAt, item.status);
      return obj;
    });

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single follow up
// @route   GET /api/followups/:id
// @access  Private
export const getFollowUpById = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate("client", "clientName companyName email phone contacts")
      .populate("project", "projectName projectCode status")
      .populate("assignedTo", "firstName lastName email phone")
      .populate("createdBy", "firstName lastName");

    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    const obj = followUp.toObject();
    obj.slaStatus = calculateSlaStatus(followUp.scheduledAt, followUp.status);

    res.status(200).json({ success: true, data: obj });
  } catch (error) {
    next(error);
  }
};

// @desc    Create follow up
// @route   POST /api/followups
// @access  Private
export const createFollowUp = async (req, res, next) => {
  try {
    const followUpData = {
      ...req.body,
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
    };

    const followUp = await FollowUp.create(followUpData);

    // Update Client's nextFollowUpAt
    if (followUp.client) {
      await Client.findByIdAndUpdate(followUp.client, {
        nextFollowUpAt: followUp.scheduledAt,
      });
    }

    await logActivity({
      action: "create_followup",
      description: `Follow-up "${followUp.title}" (Level ${followUp.level}, ${followUp.type}) created`,
      performedBy: req.user._id,
      entityType: "followup",
      entityId: followUp._id,
    });

    if (followUp.assignedTo && followUp.assignedTo.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: followUp.assignedTo,
        title: "New Follow-up Assigned",
        message: `You were assigned to Level ${followUp.level} follow-up: "${followUp.title}" scheduled for ${new Date(followUp.scheduledAt).toLocaleString()}.`,
        type: "followup_reminder",
        channels: ["in_app"],
        entityType: "followup",
        entityId: followUp._id,
      });
    }

    if (await shouldDispatchTelegramEvent("followUpReminder")) {
      await sendTelegramMessage(
        `📅 *Follow-Up Scheduled (Level ${followUp.level})*\n\n*Title:* ${followUp.title}\n*Type:* ${followUp.type}\n*Escalation:* ${followUp.escalationTier}\n*Scheduled:* ${new Date(followUp.scheduledAt).toLocaleString()}\n*Priority:* ${followUp.priority}`
      );
    }

    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

// @desc    Update follow up
// @route   PUT /api/followups/:id
// @access  Private
export const updateFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    const previousStatus = followUp.status;
    Object.assign(followUp, req.body);

    if (req.body.status === "completed" && previousStatus !== "completed") {
      followUp.completedAt = new Date();
      if (followUp.client) {
        await Client.findByIdAndUpdate(followUp.client, {
          lastContactedAt: new Date(),
          ...(followUp.nextFollowUpAt ? { nextFollowUpAt: followUp.nextFollowUpAt } : {}),
        });
      }
    }

    await followUp.save();

    await logActivity({
      action: "update_followup",
      description: `Follow-up "${followUp.title}" was updated`,
      performedBy: req.user._id,
      entityType: "followup",
      entityId: followUp._id,
    });

    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    next(error);
  }
};

// @desc    Log outcome & optionally advance to next level sequence
// @route   POST /api/followups/:id/outcome
// @access  Private
export const logOutcomeAndAdvance = async (req, res, next) => {
  try {
    const {
      outcome,
      outcomeNotes,
      createNextLevel,
      nextLevel,
      nextScheduledAt,
      nextType = "call",
      nextTitle,
      nextPriority = "medium",
      nextEscalationTier = "standard",
      assignedTo,
    } = req.body;

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    // Mark current follow-up completed with outcome
    followUp.status = "completed";
    followUp.completedAt = new Date();
    followUp.outcome = outcome || "connected_interested";
    if (outcomeNotes) followUp.outcomeNotes = outcomeNotes;
    await followUp.save();

    // Update Client lastContactedAt
    if (followUp.client) {
      await Client.findByIdAndUpdate(followUp.client, {
        lastContactedAt: new Date(),
      });
    }

    await logActivity({
      action: "complete_followup",
      description: `Follow-up "${followUp.title}" completed with outcome: ${followUp.outcome}`,
      performedBy: req.user._id,
      entityType: "followup",
      entityId: followUp._id,
    });

    let nextFollowUp = null;

    // Advance to Next Level Cadence if requested
    if (createNextLevel && nextScheduledAt) {
      const computedLevel = nextLevel || Math.min(5, (followUp.level || 1) + 1);
      const computedAttempt = (followUp.sequenceAttempt || 1) + 1;

      const levelTitles = {
        1: "Discovery & Qualification",
        2: "Deep Engagement & Value Demo",
        3: "Decision Alignment & Proposal Review",
        4: "Urgent Negotiation & Escalation",
        5: "Final Closing & Win-Back",
      };

      const defaultTitle = nextTitle || `Level ${computedLevel} Follow-Up: ${levelTitles[computedLevel] || "Next Touchpoint"}`;

      nextFollowUp = await FollowUp.create({
        title: defaultTitle,
        client: followUp.client,
        project: followUp.project,
        assignedTo: assignedTo || followUp.assignedTo || req.user._id,
        createdBy: req.user._id,
        level: computedLevel,
        sequenceAttempt: computedAttempt,
        escalationTier: nextEscalationTier,
        type: nextType,
        status: "pending",
        priority: nextPriority,
        scheduledAt: new Date(nextScheduledAt),
        notes: outcomeNotes ? `Previous Level ${followUp.level} Outcome: ${followUp.outcome}. Notes: ${outcomeNotes}` : "",
      });

      // Update client's nextFollowUpAt
      if (followUp.client) {
        await Client.findByIdAndUpdate(followUp.client, {
          nextFollowUpAt: nextFollowUp.scheduledAt,
        });
      }

      await logActivity({
        action: "create_followup",
        description: `Automated Level ${computedLevel} Cadence Follow-up created`,
        performedBy: req.user._id,
        entityType: "followup",
        entityId: nextFollowUp._id,
      });

      if (await shouldDispatchTelegramEvent("followUpReminder")) {
        await sendTelegramMessage(
          `🚀 *Next Cadence Stage Initiated (Level ${computedLevel})*\n\n*Title:* ${nextFollowUp.title}\n*Outcome from Prev Step:* ${followUp.outcome}\n*Scheduled:* ${new Date(nextFollowUp.scheduledAt).toLocaleString()}`
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Outcome recorded successfully",
      completedFollowUp: followUp,
      nextFollowUp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete follow up
// @route   DELETE /api/followups/:id
// @access  Private
export const deleteFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    await FollowUp.findByIdAndDelete(req.params.id);

    await logActivity({
      action: "delete_followup",
      description: `Follow-up "${followUp.title}" was deleted`,
      performedBy: req.user._id,
      entityType: "followup",
      entityId: followUp._id,
    });

    res.status(200).json({ success: true, message: "Follow-up deleted successfully" });
  } catch (error) {
    next(error);
  }
};
