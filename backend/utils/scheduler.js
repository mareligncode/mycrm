import FollowUp from "../models/FollowUp.js";
import Project from "../models/Project.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "./telegramService.js";

/**
 * Checks due/overdue follow-ups and approaching project deadlines,
 * creating in-app/email notifications and dispatching Telegram alerts without duplicates.
 */
export const runScheduledChecks = async () => {
  const now = new Date();

  try {
    // 1. Follow-up reminders: due reminderAt or already past scheduledAt with reminderSent = false
    const dueFollowUps = await FollowUp.find({
      status: { $in: ["pending", "in_progress"] },
      reminderSent: { $ne: true },
      $or: [
        { reminderAt: { $lte: now } },
        { scheduledAt: { $lte: now } },
      ],
    })
      .populate("client", "clientName companyName")
      .populate("assignedTo", "firstName lastName email")
      .limit(50);

    const telegramFollowUpEnabled = await shouldDispatchTelegramEvent("followUpReminder");

    for (const fu of dueFollowUps) {
      // Atomically claim so concurrent checks don't duplicate
      const claimed = await FollowUp.findOneAndUpdate(
        { _id: fu._id, reminderSent: { $ne: true } },
        { $set: { reminderSent: true } },
        { new: true }
      );
      if (!claimed) continue;

      const clientLabel = fu.client?.clientName || "Client";
      const isOverdue = new Date(fu.scheduledAt) < now;
      const title = isOverdue ? "Overdue Follow-Up Reminder" : "Follow-Up Due Soon";
      const message = `"${fu.title}" for ${clientLabel} (Level ${fu.level}) is ${isOverdue ? "overdue" : "due"} (${new Date(fu.scheduledAt).toLocaleString()}).`;

      if (fu.assignedTo?._id) {
        await createNotification({
          recipient: fu.assignedTo._id,
          title,
          message,
          type: "followup_reminder",
          channels: ["in_app", "telegram", "email"],
          entityType: "followup",
          entityId: fu._id,
        });
      }

      if (telegramFollowUpEnabled) {
        await sendTelegramMessage(
          `⏰ *${title}*\n\n*Task:* ${fu.title}\n*Client:* ${clientLabel}\n*Level:* ${fu.level}\n*Scheduled:* ${new Date(fu.scheduledAt).toLocaleString()}`
        );
      }
    }

    // 2. Project deadlines within next 24 hours (at most 1 alert per project per 24h)
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dueProjects = await Project.find({
      status: { $in: ["pending", "planning", "in_progress"] },
      deadline: { $gte: now, $lte: in24Hours },
    })
      .populate("client", "clientName")
      .limit(25);

    const telegramDeadlineEnabled = await shouldDispatchTelegramEvent("projectDeadline");

    for (const proj of dueProjects) {
      if (!proj.projectManager) continue;

      const alreadyNotified = await Notification.findOne({
        recipient: proj.projectManager,
        entityType: "project",
        entityId: proj._id,
        type: "deadline",
        createdAt: { $gte: yesterday },
      });

      if (alreadyNotified) continue;

      const title = "Project Deadline Approaching";
      const message = `Project "${proj.projectName}" (${proj.projectCode}) is due by ${new Date(proj.deadline).toLocaleString()}.`;

      await createNotification({
        recipient: proj.projectManager,
        title,
        message,
        type: "deadline",
        channels: ["in_app", "telegram", "email"],
        entityType: "project",
        entityId: proj._id,
      });

      if (telegramDeadlineEnabled) {
        await sendTelegramMessage(
          `⏳ *${title}*\n\n*Project:* ${proj.projectName} (${proj.projectCode})\n*Client:* ${proj.client?.clientName || "N/A"}\n*Deadline:* ${new Date(proj.deadline).toLocaleString()}`
        );
      }
    }
  } catch (err) {
    console.error("Scheduler check error:", err.message);
  }
};

let schedulerInterval = null;

export const startScheduler = (intervalMs = 60 * 1000) => {
  if (schedulerInterval) return schedulerInterval;

  // Initial delay so DB connection finishes before first scan
  const bootTimer = setTimeout(() => {
    runScheduledChecks();
  }, 5000);
  if (bootTimer.unref) bootTimer.unref();

  schedulerInterval = setInterval(runScheduledChecks, intervalMs);
  if (schedulerInterval.unref) schedulerInterval.unref();

  return schedulerInterval;
};

export const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
};
