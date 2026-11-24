import TelegramIntegration from "../models/TelegramIntegration.js";

export const sendTelegramMessage = async (text, specificChatId = null) => {
  try {
    const integration = await TelegramIntegration.findOne({ isActive: true }).select("+botToken");
    if (!integration || !integration.botToken) {
      return { success: false, reason: "No active telegram bot integration found" };
    }

    const targetChatId = specificChatId || integration.chatId;
    if (!targetChatId) {
      return { success: false, reason: "No chat ID configured for Telegram" };
    }

    const url = `https://api.telegram.org/bot${integration.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, messageId: data.result.message_id };
    } else {
      console.error("Telegram API error:", data.description);
      return { success: false, error: data.description };
    }
  } catch (error) {
    console.error("Telegram delivery failed:", error.message);
    return { success: false, error: error.message };
  }
};

export const shouldDispatchTelegramEvent = async (eventName) => {
  try {
    const integration = await TelegramIntegration.findOne({ isActive: true });
    if (!integration) return false;
    return Boolean(integration.events && integration.events[eventName]);
  } catch (err) {
    return false;
  }
};
