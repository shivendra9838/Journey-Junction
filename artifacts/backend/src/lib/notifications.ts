import nodemailer from "nodemailer";
import { isValidObjectId } from "mongoose";
import { isDBConnected, NotificationModel, UserModel } from "@workspace/db";
import { emitToUser } from "../v1/integrations/realtime.service";

type NotificationType =
  | "booking_confirmed"
  | "payment_successful"
  | "booking_cancelled"
  | "review_request"
  | "trip_reminder"
  | "system";

function toPublicNotification(doc: any) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  return {
    id: json.id ?? json._id?.toString?.(),
    title: json.title,
    message: json.message,
    type: json.type,
    isRead: Boolean(json.isRead),
    createdAt: json.createdAt,
  };
}

function smtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

type MailContent = {
  text: string;
  html?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl(path = "/") {
  const base = process.env.FRONTEND_URL || process.env.APP_BASE_URL || "http://localhost:5173";
  return `${base.replace(/\/$/, "")}${path}`;
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || "support@journeyjunction.com";
}

function getSecurityEmail() {
  return process.env.SECURITY_EMAIL || "security@journeyjunction.com";
}

function browserFromUserAgent(userAgent = "") {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  return "Web browser";
}

function deviceFromUserAgent(userAgent = "") {
  if (/Windows/i.test(userAgent)) return "Windows Desktop";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "Mac";
  if (/Android/i.test(userAgent)) return "Android device";
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  return "Unknown device";
}

function welcomeEmailHtml(name: string) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome to Journey Junction</title>
  </head>
  <body style="margin:0;background:#fff8e8;color:#102331;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your account has been created successfully.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8e8;padding:0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;overflow:hidden;box-shadow:0 20px 55px rgba(16,35,49,0.10);">
            <tr>
              <td style="padding:32px 30px 54px;background:linear-gradient(90deg,rgba(255,255,255,.94),rgba(255,255,255,.62)),url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80');background-size:cover;background-position:center right;">
                <div style="font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#138b80;">Journey<br>Junction</div>
                <h1 style="margin:44px 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:39px;line-height:1.08;color:#102331;font-weight:500;">Welcome to<br><span style="color:#138b80;font-weight:700;">Journey Junction!</span></h1>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#102331;font-weight:700;max-width:300px;">Your account has been created successfully.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 52px 34px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:74px;vertical-align:top;">
                      <div style="width:58px;height:58px;border-radius:50%;background:#fff7e6;text-align:center;line-height:58px;color:#138b80;font-size:26px;">&#127881;</div>
                    </td>
                    <td style="vertical-align:top;">
                      <p style="margin:0 0 7px;font-size:16px;font-weight:900;color:#102331;">Hi ${escapeHtml(name)},</p>
                      <p style="margin:0;font-size:13px;line-height:1.7;color:#536675;">We're excited to have you on board. Get ready to explore amazing places, plan unforgettable trips and create memories that last a lifetime.</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:34px 0 18px;font-size:14px;font-weight:900;color:#102331;">With your account, you can:</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="width:20%;padding:0 4px;vertical-align:top;">
                      <div style="width:48px;height:48px;border-radius:50%;background:#e9faf7;text-align:center;line-height:48px;color:#138b80;font-size:22px;margin:0 auto 8px;">&#128506;</div>
                      <div style="font-size:11px;line-height:1.35;color:#102331;font-weight:800;">Discover<br>destinations</div>
                    </td>
                    <td align="center" style="width:20%;padding:0 4px;vertical-align:top;">
                      <div style="width:48px;height:48px;border-radius:50%;background:#e9faf7;text-align:center;line-height:48px;color:#138b80;font-size:22px;margin:0 auto 8px;">&#128205;</div>
                      <div style="font-size:11px;line-height:1.35;color:#102331;font-weight:800;">Plan custom<br>itineraries</div>
                    </td>
                    <td align="center" style="width:20%;padding:0 4px;vertical-align:top;">
                      <div style="width:48px;height:48px;border-radius:50%;background:#e9faf7;text-align:center;line-height:48px;color:#138b80;font-size:22px;margin:0 auto 8px;">&#9825;</div>
                      <div style="font-size:11px;line-height:1.35;color:#102331;font-weight:800;">Save your<br>favorite places</div>
                    </td>
                    <td align="center" style="width:20%;padding:0 4px;vertical-align:top;">
                      <div style="width:48px;height:48px;border-radius:50%;background:#e9faf7;text-align:center;line-height:48px;color:#138b80;font-size:22px;margin:0 auto 8px;">&#127915;</div>
                      <div style="font-size:11px;line-height:1.35;color:#102331;font-weight:800;">Manage<br>bookings</div>
                    </td>
                    <td align="center" style="width:20%;padding:0 4px;vertical-align:top;">
                      <div style="width:48px;height:48px;border-radius:50%;background:#e9faf7;text-align:center;line-height:48px;color:#138b80;font-size:22px;margin:0 auto 8px;">&#129523;</div>
                      <div style="font-size:11px;line-height:1.35;color:#102331;font-weight:800;">Travel<br>smarter</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(appUrl('/destinations'))}" style="display:inline-block;min-width:250px;text-align:center;padding:14px 28px;border-radius:999px;background:#138b80;color:#ffffff;text-decoration:none;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(19,139,128,.22);">Start Exploring &#8594;</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;border-radius:14px;background:#eaf6fb;overflow:hidden;">
                  <tr>
                    <td style="width:66px;padding:18px;vertical-align:middle;">
                      <div style="width:44px;height:44px;border-radius:12px;background:#8ed4e4;text-align:center;line-height:44px;color:#ffffff;font-size:21px;">&#129523;</div>
                    </td>
                    <td style="padding:18px 18px 18px 0;vertical-align:middle;">
                      <p style="margin:0 0 4px;font-size:14px;font-weight:900;color:#102331;">The world is full of beautiful places.</p>
                      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#138b80;font-style:italic;">Let's find your next adventure!</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 46px;background:#fffdf7;border-top:1px solid #f3ead8;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:50%;vertical-align:top;border-right:1px solid #efe6d6;padding-right:26px;">
                      <p style="margin:0 0 8px;font-size:12px;color:#536675;">See you on the road,</p>
                      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#138b80;font-style:italic;">Journey Junction Team</p>
                    </td>
                    <td style="width:50%;vertical-align:top;padding-left:26px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:900;color:#102331;">Need help?</p>
                      <p style="margin:0 0 8px;font-size:12px;color:#536675;">We're here for you.</p>
                      <p style="margin:0;font-size:12px;font-weight:900;"><a href="mailto:${getSupportEmail()}" style="color:#138b80;text-decoration:none;">${getSupportEmail()}</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px;background:#fff3cd;color:#102331;">
                <p style="margin:0 0 8px;font-size:11px;color:#8a7b50;">© ${year} Journey Junction</p>
                <p style="margin:0;font-size:12px;letter-spacing:.5px;color:#102331;">Explore &nbsp;&bull;&nbsp; Dream &nbsp;&bull;&nbsp; Discover</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
function loginEmailHtml(params: { name: string; email: string; date: string; time: string; browser: string; device: string; location: string }) {
  const dashboardUrl = appUrl("/dashboard");
  const secureUrl = appUrl("/profile");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Sign-in to Your Journey Junction Account</title>
  </head>
  <body style="margin:0;background:#eef4f6;color:#102331;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Journey Junction account was successfully accessed.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4f6;padding:0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;overflow:hidden;box-shadow:0 20px 55px rgba(16,35,49,0.12);">
            <tr>
              <td style="padding:34px 34px 56px;background:linear-gradient(90deg,rgba(4,25,39,.94),rgba(4,25,39,.72)),url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80');background-size:cover;background-position:center;">
                <div style="font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#ffffff;">Journey<br>Junction</div>
                <h1 style="margin:48px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.03;color:#ffffff;font-weight:500;">Welcome back,<br><span style="color:#27c7b8;font-weight:700;">${escapeHtml(params.name)}!</span></h1>
                <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#ffffff;font-weight:700;max-width:310px;">Your Journey Junction account was successfully accessed.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 52px 34px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:64px;vertical-align:top;">
                      <div style="width:52px;height:52px;border-radius:50%;background:#e9faf7;text-align:center;line-height:52px;color:#129585;font-size:24px;">&#128737;</div>
                    </td>
                    <td style="vertical-align:top;">
                      <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#102331;">We're glad to see you again.</p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:#536675;">Here are the details of your recent sign-in.</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;border:1px solid #e6edf0;border-radius:18px;overflow:hidden;background:#ffffff;">
                  <tr>
                    <td align="center" style="width:25%;padding:18px 8px;border-right:1px solid #e6edf0;">
                      <div style="font-size:19px;color:#34586a;">&#128197;</div>
                      <div style="margin-top:8px;font-size:10px;color:#607583;font-weight:800;">Date</div>
                      <div style="margin-top:5px;font-size:12px;color:#102331;font-weight:900;">${escapeHtml(params.date)}</div>
                    </td>
                    <td align="center" style="width:25%;padding:18px 8px;border-right:1px solid #e6edf0;">
                      <div style="font-size:19px;color:#34586a;">&#128338;</div>
                      <div style="margin-top:8px;font-size:10px;color:#607583;font-weight:800;">Time</div>
                      <div style="margin-top:5px;font-size:12px;color:#102331;font-weight:900;">${escapeHtml(params.time)}</div>
                    </td>
                    <td align="center" style="width:25%;padding:18px 8px;border-right:1px solid #e6edf0;">
                      <div style="font-size:19px;color:#34586a;">&#128187;</div>
                      <div style="margin-top:8px;font-size:10px;color:#607583;font-weight:800;">Device</div>
                      <div style="margin-top:5px;font-size:12px;line-height:1.35;color:#102331;font-weight:900;">${escapeHtml(params.browser)}<br>on ${escapeHtml(params.device)}</div>
                    </td>
                    <td align="center" style="width:25%;padding:18px 8px;">
                      <div style="font-size:19px;color:#34586a;">&#128205;</div>
                      <div style="margin-top:8px;font-size:10px;color:#607583;font-weight:800;">Location</div>
                      <div style="margin-top:5px;font-size:12px;color:#102331;font-weight:900;">${escapeHtml(params.location)}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;min-width:210px;text-align:center;padding:14px 28px;border-radius:999px;background:#129585;color:#ffffff;text-decoration:none;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(18,149,133,.22);">Open Dashboard &#8594;</a>
                    </td>
                  </tr>
                </table>
                <div style="height:1px;background:#e6edf0;margin:32px 0 24px;text-align:center;"></div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:18px;background:#e9faf7;">
                  <tr>
                    <td style="width:64px;padding:20px;vertical-align:top;">
                      <div style="width:48px;height:48px;border-radius:50%;background:#d5f4ef;text-align:center;line-height:48px;color:#0f766e;font-size:23px;">&#128274;</div>
                    </td>
                    <td style="padding:20px 22px 20px 0;vertical-align:top;">
                      <p style="margin:0 0 6px;font-size:14px;font-weight:900;color:#102331;">Was this you?</p>
                      <p style="margin:0;font-size:12px;line-height:1.65;color:#536675;">If yes, you can ignore this email.<br>If not, secure your account by <a href="${escapeHtml(secureUrl)}" style="color:#0f766e;text-decoration:none;font-weight:900;">resetting your password</a> or contact our support team.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 46px;background:#f7fbfc;border-top:1px solid #edf3f5;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:50%;vertical-align:top;border-right:1px solid #e1eaee;padding-right:26px;">
                      <p style="margin:0 0 8px;font-size:12px;color:#536675;">Safe travels,</p>
                      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#129585;font-style:italic;">Journey Junction Team</p>
                    </td>
                    <td style="width:50%;vertical-align:top;padding-left:26px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:900;color:#102331;">Need help?</p>
                      <p style="margin:0 0 8px;font-size:12px;color:#536675;">We're here for you.</p>
                      <p style="margin:0;font-size:12px;font-weight:900;"><a href="mailto:${getSecurityEmail()}" style="color:#129585;text-decoration:none;">${getSecurityEmail()}</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px;background:#062236;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:.5px;color:#d9eef3;">Explore &nbsp;&bull;&nbsp; Dream &nbsp;&bull;&nbsp; Discover</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
function authEmailLayout(params: {
  preheader: string;
  title: string;
  subtitle: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  noteTitle: string;
  noteBody: string;
  theme?: "welcome" | "login";
}) {
  const appName = "Journey Junction";
  const supportEmail = getSupportEmail();
  const theme = params.theme ?? "welcome";
  const heroGradient = theme === "login"
    ? "linear-gradient(135deg,#111827,#374151,#0f766e)"
    : "linear-gradient(135deg,#4f46e5,#0ea5e9,#10b981)";
  const ctaColor = theme === "login" ? "#0f766e" : "#4f46e5";
  const noteBg = theme === "login" ? "#fffbeb" : "#f8fafc";
  const noteBorder = theme === "login" ? "#fde68a" : "#e7e5e4";
  const noteTitleColor = theme === "login" ? "#92400e" : "#1c1917";
  const noteBodyColor = theme === "login" ? "#a16207" : "#78716c";
  const footerText = theme === "login"
    ? "You received this security email because your Journey Junction account was accessed."
    : "You received this email because this address is connected to a Journey Junction account.";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(params.title)}</title>
  </head>
  <body style="margin:0;background:#f8f5f0;color:#1c1917;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5f0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #eee7dc;box-shadow:0 16px 44px rgba(28,25,23,0.08);">
            <tr>
              <td style="padding:26px 30px;background:${heroGradient};">
                <div style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.82);">${appName}</div>
                <h1 style="margin:14px 0 8px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:900;">${escapeHtml(params.title)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">${escapeHtml(params.subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 14px;font-size:17px;font-weight:800;color:#1c1917;">${escapeHtml(params.greeting)}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#57534e;">${escapeHtml(params.body)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:999px;background:${ctaColor};">
                      <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;border-radius:999px;">${escapeHtml(params.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:28px;padding:18px;border-radius:18px;background:${noteBg};border:1px solid ${noteBorder};">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:900;color:${noteTitleColor};">${escapeHtml(params.noteTitle)}</p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:${noteBodyColor};">${escapeHtml(params.noteBody)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#fafaf9;border-top:1px solid #f1f0ed;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#78716c;">Need help? Contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#4f46e5;text-decoration:none;font-weight:800;">${escapeHtml(supportEmail)}</a>.</p>
                <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">${footerText}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailsRows(rows: Array<[string, string | number | undefined | null]>) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([label, value]) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f1f0ed;color:#78716c;font-size:13px;font-weight:700;width:38%;">${escapeHtml(label)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #f1f0ed;color:#1c1917;font-size:14px;font-weight:800;">${escapeHtml(String(value))}</td>
      </tr>
    `)
    .join("");
}

function travelEmailLayout(params: {
  preheader: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  rows?: Array<[string, string | number | undefined | null]>;
  noteTitle: string;
  noteBody: string;
}) {
  const appName = "Journey Junction";
  const supportEmail = getSupportEmail();
  const rowsHtml = params.rows?.length ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-radius:18px;background:#fafaf9;border:1px solid #eee7dc;padding:4px 18px;">
      ${detailsRows(params.rows)}
    </table>
  ` : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(params.title)}</title>
  </head>
  <body style="margin:0;background:#f8f5f0;color:#1c1917;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5f0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #eee7dc;box-shadow:0 16px 44px rgba(28,25,23,0.08);">
            <tr>
              <td style="padding:30px;background:linear-gradient(135deg,#312e81,#2563eb,#06b6d4);">
                <div style="font-size:12px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;color:rgba(255,255,255,0.76);">${escapeHtml(params.eyebrow)}</div>
                <h1 style="margin:14px 0 8px;font-size:30px;line-height:1.14;color:#ffffff;font-weight:900;">${escapeHtml(params.title)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">${escapeHtml(params.subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#57534e;">${escapeHtml(params.body)}</p>
                ${rowsHtml}
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:999px;background:#4f46e5;">
                      <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:900;border-radius:999px;">${escapeHtml(params.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:26px;padding:18px;border-radius:18px;background:#ecfdf5;border:1px solid #bbf7d0;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:900;color:#14532d;">${escapeHtml(params.noteTitle)}</p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#166534;">${escapeHtml(params.noteBody)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#fafaf9;border-top:1px solid #f1f0ed;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#78716c;">${appName} travel support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#4f46e5;text-decoration:none;font-weight:800;">${escapeHtml(supportEmail)}</a></p>
                <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">This message was sent by ${appName} for your travel enquiry or booking activity.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendMail(to: string | undefined, subject: string, content: string | MailContent) {
  const transport = smtpTransport();
  if (!transport || !to) return;
  const mailContent = typeof content === "string" ? { text: content } : content;
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: mailContent.text,
    html: mailContent.html,
  });
}

export async function createUserNotification(userId: string | undefined, title: string, message: string, type: NotificationType = "system") {
  if (!userId || !isDBConnected() || !isValidObjectId(userId)) return null;
  const notification = await NotificationModel.create({ userId, title, message, type });
  const publicNotification = toPublicNotification(notification);
  emitToUser(userId, "notification", publicNotification);
  return publicNotification;
}

export async function notifyUser(params: {
  userId?: string;
  email?: string;
  subject: string;
  title: string;
  message: string;
  html?: string;
  type?: NotificationType;
}) {
  await Promise.allSettled([
    createUserNotification(params.userId, params.title, params.message, params.type),
    sendMail(params.email, params.subject, { text: params.message, html: params.html }),
  ]);
}

export async function notifyWelcomeUser(userId: string | undefined, email: string, name: string) {
  const message = [
    `Hi ${name},`,
    "",
    "Welcome to Journey Junction!",
    "",
    "We're excited to have you join our travel community.",
    "",
    "Your account has been successfully created and you're now ready to:",
    "- Discover amazing destinations",
    "- Plan personalized trips",
    "- Save your favorite places",
    "- Manage bookings easily",
    "- Explore travel recommendations",
    "",
    "Start your next adventure today by visiting your dashboard.",
    "",
    "Thank you for choosing Journey Junction.",
    "",
    "Happy Travels,",
    "The Journey Junction Team",
    "",
    "Need help?",
    "Contact us at support@journeyjunction.com",
  ].join("\n");
  await notifyUser({
    userId,
    email,
    subject: "Welcome to Journey Junction!",
    title: "Welcome to Journey Junction",
    message,
    html: welcomeEmailHtml(name),
    type: "system",
  });
}

export async function notifyLoginUser(userId: string | undefined, email: string, name: string, userAgent = "") {
  const now = new Date();
  const loginDate = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" });
  const loginTime = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short" });
  const browser = browserFromUserAgent(userAgent);
  const device = deviceFromUserAgent(userAgent);
  const location = "Not available";
  const dashboardLink = appUrl("/dashboard");
  const message = [
    `Hi ${name},`,
    "",
    "Your Journey Junction account was successfully accessed.",
    "",
    "Login Details:",
    `- Date: ${loginDate}`,
    `- Time: ${loginTime}`,
    `- Email: ${email}`,
    `- Browser: ${browser}`,
    `- Device: ${device}`,
    `- Location: ${location}`,
    "",
    "If this was you, no action is required.",
    "",
    "If you do not recognize this activity, please reset your password immediately and contact our support team.",
    "",
    `Open Dashboard: ${dashboardLink}`,
    "",
    "Stay secure,",
    "Journey Junction Security Team",
    "",
    "Need help?",
    "Contact us at support@journeyjunction.com",
  ].join("\n");
  await notifyUser({
    userId,
    email,
    subject: "New Sign-in to Your Journey Junction Account",
    title: "New Login",
    message,
    html: loginEmailHtml({ name, email, date: loginDate, time: loginTime, browser, device, location }),
    type: "system",
  });
}

export async function notifyAdminUsers(title: string, message: string, type: NotificationType = "system") {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const tasks: Promise<unknown>[] = [sendMail(adminEmail, title, message)];
  if (isDBConnected() && adminEmail) {
    tasks.push(
      UserModel.findOne({ email: adminEmail.toLowerCase() })
        .then(admin => admin ? createUserNotification(admin._id.toString(), title, message, type) : null),
    );
  }
  await Promise.allSettled(tasks);
}

export type EnquiryEmailInput = {
  name: string;
  email: string;
  phone?: string;
  destination: string;
  travelDate?: string;
  travelers?: string | number;
  budget?: string | number;
  message: string;
  submittedAt?: string;
};

export function buildAdminEnquiryEmail(input: EnquiryEmailInput): MailContent {
  const submittedAt = input.submittedAt || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const text = [
    "New enquiry received - Journey Junction",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone || "Not provided"}`,
    `Destination: ${input.destination}`,
    `Travel Date: ${input.travelDate || "Flexible"}`,
    `Travelers: ${input.travelers || "Not provided"}`,
    `Budget: ${input.budget || "Not provided"}`,
    `Submitted At: ${submittedAt}`,
    "",
    input.message,
  ].join("\n");
  return {
    text,
    html: travelEmailLayout({
      preheader: `${input.name} submitted a new travel enquiry for ${input.destination}.`,
      eyebrow: "New Travel Enquiry",
      title: "New enquiry received",
      subtitle: "A traveller is interested in planning a trip with Journey Junction.",
      body: "A new enquiry has been submitted. Review the traveller details below and respond quickly while the trip intent is fresh.",
      ctaLabel: "Open Admin Panel",
      ctaUrl: appUrl("/admin"),
      rows: [
        ["Name", input.name],
        ["Email", input.email],
        ["Phone", input.phone || "Not provided"],
        ["Destination / Interest", input.destination],
        ["Travel Date", input.travelDate || "Flexible"],
        ["Travelers", input.travelers || "Not provided"],
        ["Budget", input.budget || "Not provided"],
        ["Submitted At", submittedAt],
        ["Message", input.message],
      ],
      noteTitle: "Recommended next step",
      noteBody: "Call or email the traveller with package options, pickup details, hotel suggestions, and a clear next action.",
    }),
  };
}

export function buildUserEnquiryEmail(input: EnquiryEmailInput): MailContent {
  const text = [
    `Hi ${input.name},`,
    "",
    "We received your enquiry at Journey Junction. Our travel team will review your details and contact you shortly.",
    "",
    `Destination: ${input.destination}`,
    `Travel Date: ${input.travelDate || "Flexible"}`,
    `Travelers: ${input.travelers || "Not provided"}`,
    "",
    input.message,
  ].join("\n");
  return {
    text,
    html: travelEmailLayout({
      preheader: "Your Journey Junction enquiry has been received.",
      eyebrow: "Enquiry Received",
      title: "We received your enquiry",
      subtitle: "Our travel team will help shape your trip into a smooth, memorable journey.",
      body: `Hi ${input.name}, thank you for contacting Journey Junction. Your enquiry has reached our travel team, and we will respond with suitable options as soon as possible.`,
      ctaLabel: "Explore Destinations",
      ctaUrl: appUrl("/destinations"),
      rows: [
        ["Destination / Interest", input.destination],
        ["Travel Date", input.travelDate || "Flexible"],
        ["Travelers", input.travelers || "Not provided"],
        ["Message", input.message],
      ],
      noteTitle: "What happens next",
      noteBody: "A Journey Junction expert will review your request and contact you with destination, hotel, transport, and package suggestions.",
    }),
  };
}

export function buildTripConfirmedEmail(input: {
  name: string;
  email: string;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  travelMode: string;
  vehicle: string;
  amount: number;
  bookingReference: string;
  paymentId?: string;
}) {
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(input.amount);
  const text = [
    `Hi ${input.name},`,
    "",
    `Your Journey Junction trip to ${input.destination} is confirmed.`,
    `Booking Reference: ${input.bookingReference}`,
    `Travel Dates: ${input.checkInDate} to ${input.checkOutDate}`,
    `Transport: ${input.travelMode} - ${input.vehicle}`,
    `Amount Paid: ${amount}`,
    input.paymentId ? `Payment ID: ${input.paymentId}` : "",
    "",
    "Please pack your bags and get ready for your trip.",
  ].filter(Boolean).join("\n");

  return {
    text,
    html: travelEmailLayout({
      preheader: `Your ${input.destination} trip is confirmed.`,
      eyebrow: "Booking Confirmed",
      title: "Your journey is confirmed",
      subtitle: "Payment received. Your Journey Junction trip is now booked.",
      body: `Hi ${input.name}, congratulations. Your trip to ${input.destination} is confirmed after successful payment. Please pack your bags and get ready for your journey.`,
      ctaLabel: "Open Dashboard",
      ctaUrl: appUrl("/dashboard"),
      rows: [
        ["Destination", input.destination],
        ["Travel Dates", `${input.checkInDate} to ${input.checkOutDate}`],
        ["Transport", `${input.travelMode} - ${input.vehicle}`],
        ["Amount Paid", amount],
        ["Booking Reference", input.bookingReference],
        ["Transaction ID", input.paymentId || "Stripe Checkout"],
      ],
      noteTitle: "Get ready",
      noteBody: "Keep your booking reference handy. Your dashboard will show trip status, payment status, driver assignment, and travel countdown.",
    }),
  };
}
