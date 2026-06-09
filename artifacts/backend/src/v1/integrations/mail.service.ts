import nodemailer from "nodemailer";
import { logger } from "../../lib/logger";

const transport = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
};

export async function sendEmail(input: { to: string; subject: string; html: string; text?: string }) {
  const info = await transport().sendMail({
    from: process.env.MAIL_FROM ?? "Wandr <no-reply@wandr.local>",
    ...input,
  });
  logger.info({ messageId: info.messageId, envelope: info.envelope }, "Email notification sent");
  return info;
}
