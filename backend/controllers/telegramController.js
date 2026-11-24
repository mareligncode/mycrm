import TelegramIntegration from "../models/TelegramIntegration.js";
import { sendTelegramMessage } from "../utils/telegramService.js";
import { logActivity } from "../utils/activityLogger.js";

// @desc    Get telegram integration settings
// @route   GET /api/telegram
// @access  Private (admin, super_admin)
export const getTelegramConfig = async (req, res, next) => {
  try {
    const integration = await TelegramIntegration.findOne().populate("connectedBy", "firstName lastName email");
    if (!integration) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No Telegram integration configured",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: integration._id,
        name: integration.name,
        botUsername: integration.botUsername,
        chatId: integration.chatId,
        chatType: integration.chatType,
        isActive: integration.isActive,
        events: integration.events,
        connectedBy: integration.connectedBy,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save or update telegram integration settings
// @route   POST /api/telegram
// @access  Private (admin, super_admin)
export const updateTelegramConfig = async (req, res, next) => {
  try {
    const { name, botToken, botUsername, chatId, chatType, isActive, events } = req.body;

    let integration = await TelegramIntegration.findOne();

    if (!integration) {
      if (!botToken) {
        return res.status(400).json({ success: false, message: "botToken is required for first setup" });
      }

      integration = await TelegramIntegration.create({
        name: name || "Main CRM Telegram Bot",
        botToken,
        botUsername,
        chatId,
        chatType: chatType || "group",
        isActive: isActive !== undefined ? isActive : true,
        events: events || {},
        connectedBy: req.user._id,
      });
    } else {
      if (name) integration.name = name;
      if (botToken) integration.botToken = botToken;
      if (botUsername !== undefined) integration.botUsername = botUsername;
      if (chatId !== undefined) integration.chatId = chatId;
      if (chatType !== undefined) integration.chatType = chatType;
      if (isActive !== undefined) integration.isActive = isActive;
      if (events) integration.events = { ...integration.events, ...events };
      integration.connectedBy = req.user._id;

      await integration.save();
    }

    await logActivity({
      action: "update_telegram_config",
      description: `Telegram integration settings updated by ${req.user.email}`,
      performedBy: req.user._id,
      entityType: "user",
      entityId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Telegram configuration saved successfully",
      data: {
        _id: integration._id,
        name: integration.name,
        botUsername: integration.botUsername,
        chatId: integration.chatId,
        chatType: integration.chatType,
        isActive: integration.isActive,
        events: integration.events,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send test Telegram message
// @route   POST /api/telegram/test
// @access  Private (admin, super_admin)
export const testTelegramConnection = async (req, res, next) => {
  try {
    const { chatId } = req.body;
    const result = await sendTelegramMessage(
      `✅ *CRM Telegram Test Message*\n\nTelegram integration is working properly! Triggered by ${req.user.firstName} ${req.user.lastName} at ${new Date().toLocaleString()}.`,
      chatId
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Test message sent successfully to Telegram!",
        result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to send Telegram message",
        error: result.error || result.reason,
      });
    }
  } catch (error) {
    next(error);
  }
};
