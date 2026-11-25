/**
 * Outbound Email Service supporting:
 * 1. Resend HTTP API (RESEND_API_KEY)
 * 2. SMTP via optional nodemailer dependency (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 *
 * Gracefully returns { success: false, reason } when no email transport is configured.
 */

export const isEmailConfigured = () => {
  return Boolean(
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject) {
    return { success: false, reason: "Recipient and subject are required" };
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "crm@localhost";

  // Strategy 1: Resend HTTP API (zero extra npm dependencies)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          text: text || undefined,
          html: html || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, provider: "resend", messageId: data.id };
      }
      return { success: false, provider: "resend", error: data.message || `HTTP ${response.status}` };
    } catch (err) {
      return { success: false, provider: "resend", error: err.message };
    }
  }

  // Strategy 2: Optional nodemailer SMTP transport if installed
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailerModule = await import("nodemailer").catch(() => null);
      if (!nodemailerModule) {
        return {
          success: false,
          reason: "SMTP configured but nodemailer package is not installed; install nodemailer or set RESEND_API_KEY",
        };
      }
      const nodemailer = nodemailerModule.default || nodemailerModule;
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465 || process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      return { success: true, provider: "smtp", messageId: info.messageId };
    } catch (err) {
      return { success: false, provider: "smtp", error: err.message };
    }
  }

  return { success: false, reason: "Email transport not configured" };
};
