import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendTelegramMessage } from "./telegramService.js";

export const createNotification = async ({
  recipient,
  title,
  message,
  type,
  channels = ["in_app"],
  entityType = null,
  entityId = null,
}) => {
  try {
    const notification = new Notification({
      recipient,
      title,
      message,
      type,
      channels,
      entityType,
      entityId,
      deliveryStatus: {
        in_app: { status: "sent" },
        telegram: { status: "pending" },
        email: { status: "skipped" },
      },
    });

    if (channels.includes("telegram")) {
      const user = await User.findById(recipient);
      const userChatId = user?.telegram?.isConnected ? user.telegram.chatId : null;
      const result = await sendTelegramMessage(`🔔 *${title}*\n\n${message}`, userChatId);

      if (result.success) {
        notification.deliveryStatus.telegram = {
          status: "sent",
          messageId: String(result.messageId),
          sentAt: new Date(),
        };
      } else {
        notification.deliveryStatus.telegram = {
          status: "failed",
          error: result.error || result.reason,
        };
      }
    } else {
      notification.deliveryStatus.telegram = { status: "skipped" };
    }

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Notification creation error:", error.message);
    return null;
  }
};

export const broadcastNotification = async ({
  recipients,
  title,
  message,
  type,
  channels = ["in_app"],
  entityType = null,
  entityId = null,
}) => {
  const promises = recipients.map((userId) =>
    createNotification({
      recipient: userId,
      title,
      message,
      type,
      channels,
      entityType,
      entityId,
    })
  );
  return await Promise.all(promises);
};
