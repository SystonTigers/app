/**
 * Email: transactional messages sent through Resend.
 *
 * Every email uses one Boost Huddle layout (renderEmail) with a plain-text
 * version. Anything a user typed (names, club names, event titles) is
 * HTML-escaped before it goes into a template.
 *
 * Needs RESEND_API_KEY and RESEND_FROM_EMAIL (an address on a domain verified
 * in Resend). Without the key, emails are logged instead of sent.
 */

import { logJSON } from "./log";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type EmailEnv = { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string };

const BRAND = "Boost Huddle";

/** Escape text for safe use inside HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "hello@club.app" -> "Boost Huddle <hello@club.app>" unless a name is already given. */
function fromAddress(env: EmailEnv): string {
  const address = env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  return address.includes("<") ? address : `${BRAND} <${address}>`;
}

/**
 * Send an email via Resend. Without RESEND_API_KEY the email is logged
 * (without its body, which can contain sign-in links) and reported as sent.
 */
export async function sendEmail(options: EmailOptions, env: EmailEnv): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    logJSON({ level: "warn", msg: "email_not_sent_no_api_key", to: options.to, subject: options.subject });
    return { success: true, messageId: "dev-mode-no-send" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: options.from || fromAddress(env),
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logJSON({ level: "error", msg: "email_resend_api_error", status: response.status, error: errorData });
      return { success: false, error: `Resend API error: ${response.status} ${errorData}` };
    }

    const data = (await response.json()) as { id: string };
    return { success: true, messageId: data.id };
  } catch (error) {
    logJSON({ level: "error", msg: "email_send_failed", error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

interface EmailContent {
  /** Big heading at the top. Plain text (escaped here). */
  heading: string;
  /** Paragraphs of plain text (escaped here). */
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Small print under the button (plain text). */
  note?: string;
  /** Extra detail rows, e.g. date / location (plain text). */
  details?: Array<[string, string]>;
  /** Who it's from, e.g. the club name. Defaults to Boost Huddle. */
  signOff?: string;
}

/** The shared Boost Huddle email layout: HTML and a matching plain-text version. */
export function renderEmail(content: EmailContent): { html: string; text: string } {
  const signOff = content.signOff || `The ${BRAND} team`;
  const paragraphs = content.paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join("");
  const details = content.details?.length
    ? `<table role="presentation" style="width:100%;margin:0 0 20px;border-collapse:collapse">${content.details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 0;color:#6b7280;width:110px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const button = content.button
    ? `<p style="margin:28px 0;text-align:center"><a href="${escapeHtml(content.button.url)}" style="display:inline-block;background:#00E5E5;color:#0B0D0F;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px">${escapeHtml(content.button.label)}</a></p>`
    : "";
  const note = content.note ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7280">${escapeHtml(content.note)}</p>` : "";
  const fallback = content.button
    ? `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;word-break:break-all">If the button doesn't work, copy this link into your browser:<br>${escapeHtml(content.button.url)}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.6">
  <table role="presentation" width="100%" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#0B0D0F;padding:20px 28px">
        <span style="color:#ffffff;font-weight:900;font-style:italic;letter-spacing:1px;text-transform:uppercase;font-size:18px">${BRAND}</span>
      </td></tr>
      <tr><td style="padding:32px 28px">
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">${escapeHtml(content.heading)}</h1>
        ${paragraphs}${details}${button}${note}
        <p style="margin:24px 0 0">${escapeHtml(signOff)}</p>
        ${fallback}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f9fafb;font-size:12px;color:#9ca3af">Sent by ${BRAND}. This is an automated email; replies aren't read.</td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.paragraphs.flatMap((p) => [p, ""]),
    ...(content.details ?? []).map(([label, value]) => `${label}: ${value}`),
    ...(content.details?.length ? [""] : []),
    ...(content.button ? [`${content.button.label}: ${content.button.url}`, ""] : []),
    ...(content.note ? [content.note, ""] : []),
    signOff,
  ].join("\n");

  return { html, text };
}

async function send(env: EmailEnv, to: string, subject: string, content: EmailContent): Promise<EmailResult> {
  const { html, text } = renderEmail(content);
  return sendEmail({ to, subject, html, text }, env);
}

/** Owner-console sign-in link (platform admins only). */
export async function sendMagicLinkEmail(email: string, magicLink: string, clubName: string, env: EmailEnv): Promise<EmailResult> {
  return send(env, email, `Your ${BRAND} sign-in link`, {
    heading: "Sign in to the owner console",
    paragraphs: [`Here's your sign-in link for ${clubName}.`],
    button: { label: "Sign in", url: magicLink },
    note: "The link works for 24 hours. If you didn't ask for it, you can ignore this email.",
  });
}

/** Sent while a new club is being set up. */
export async function sendWelcomeEmail(email: string, clubName: string, setupUrl: string, env: EmailEnv): Promise<EmailResult> {
  return send(env, email, `Welcome to ${BRAND}, ${clubName}`, {
    heading: `Welcome, ${clubName}`,
    paragraphs: [
      "Thanks for signing up. Your club is ready to go.",
      "Add your players and fixtures, then send the app link to your players and parents from your dashboard.",
    ],
    button: { label: "Open your dashboard", url: setupUrl },
  });
}

/** Confirms a new club owner's email address after sign-up. */
export async function sendVerificationEmail(email: string, link: string, env: EmailEnv): Promise<EmailResult> {
  return send(env, email, `Confirm your email for ${BRAND}`, {
    heading: "Confirm your email",
    paragraphs: [
      "Thanks for starting your club on Boost Huddle.",
      "Please confirm this is your email address so we can reach you about your club.",
    ],
    button: { label: "Confirm my email", url: link },
    note: "The link works for 24 hours. If you didn't sign up, you can ignore this email.",
  });
}

/** Password reset link. */
export async function sendPasswordResetEmail(email: string, resetLink: string, env: EmailEnv): Promise<EmailResult> {
  return send(env, email, "Reset your password", {
    heading: "Reset your password",
    paragraphs: ["We received a request to reset the password for your account."],
    button: { label: "Choose a new password", url: resetLink },
    note: "The link works for 1 hour. If you didn't ask to reset your password, you can ignore this email and nothing will change.",
  });
}

/** Club payment request (subs, kit, trips). */
export async function sendPaymentReminderEmail(
  email: string,
  name: string,
  title: string,
  amount: string,
  dueDate: string,
  link: string,
  clubName: string,
  env: EmailEnv,
): Promise<EmailResult> {
  return send(env, email, `Payment reminder: ${title}`, {
    heading: "Payment reminder",
    paragraphs: [`Hi ${name},`, `This is a reminder about a payment for ${clubName}.`],
    details: [
      ["For", title],
      ["Amount", amount],
      ["Due", dueDate || "As soon as possible"],
    ],
    button: { label: "Pay now", url: link },
    signOff: clubName,
  });
}

/** Reminder the day before a fixture or event. */
export async function sendEventReminderEmail(
  email: string,
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  clubName: string,
  env: EmailEnv,
): Promise<EmailResult> {
  return send(env, email, `Tomorrow: ${eventTitle}`, {
    heading: `Tomorrow: ${eventTitle}`,
    paragraphs: [`Hi ${name},`, `A quick reminder about tomorrow with ${clubName}.`],
    details: [
      ["When", eventDate],
      ["Where", eventLocation],
    ],
    note: "If your plans have changed, please let the club know.",
    signOff: clubName,
  });
}
