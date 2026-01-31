/**
 * Email Service - Resend Integration
 * Sends transactional emails (magic links, welcome emails, etc.)
 */

import { logJSON } from "./log";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Resend API
 * Requires RESEND_API_KEY environment variable
 */
export async function sendEmail(
  options: EmailOptions,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  // If no API key configured, log the email instead (dev mode)
  if (!env.RESEND_API_KEY) {
    logJSON({
      level: "warn",
      msg: "email_not_sent_no_api_key",
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    return {
      success: true,
      messageId: 'dev-mode-no-send',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: options.from || env.RESEND_FROM_EMAIL || 'onboarding@syston.app',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logJSON({
        level: "error",
        msg: "email_resend_api_error",
        status: response.status,
        error: errorData
      });
      return {
        success: false,
        error: `Resend API error: ${response.status} ${errorData}`,
      };
    }

    const data = await response.json() as { id: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    logJSON({
      level: "error",
      msg: "email_send_failed",
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send magic link email for passwordless authentication
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLink: string,
  clubName: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 12px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚽ Welcome to ${clubName}!</h1>
  </div>
  <div class="content">
    <h2>Your team platform is ready! 🎉</h2>
    <p>Hi there,</p>
    <p>Your club's platform has been successfully set up. Click the button below to access your admin dashboard:</p>

    <div style="text-align: center;">
      <a href="${magicLink}" class="button">Access Admin Dashboard</a>
    </div>

    <div class="warning">
      <strong>⏰ This link expires in 24 hours</strong> and can only be used once for security.
    </div>

    <p><strong>What's next?</strong></p>
    <ul>
      <li>Complete your club profile and branding</li>
      <li>Configure fixture imports from your league</li>
      <li>Set up social media integrations</li>
      <li>Invite coaches, players, and parents</li>
    </ul>

    <p>If you didn't request this, you can safely ignore this email.</p>

    <p>Questions? Reply to this email or check our documentation.</p>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>The Syston Team</strong>
    </p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply directly.</p>
    <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; word-break: break-all;">${magicLink}</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(
    {
      to: email,
      subject: `🎉 Welcome to ${clubName} - Your Platform is Ready!`,
      html,
    },
    env
  );
}

/**
 * Send welcome email after successful signup
 */
export async function sendWelcomeEmail(
  email: string,
  clubName: string,
  setupUrl: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .status {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 12px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏗️ Setting Up ${clubName}</h1>
  </div>
  <div class="content">
    <h2>Your platform is being prepared...</h2>
    <p>Hi there,</p>
    <p>Thanks for signing up! We're currently setting up your club's platform. This usually takes just a few minutes.</p>

    <div class="status">
      <strong>✨ What we're doing:</strong>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Creating your tenant database</li>
        <li>Setting up fixture imports</li>
        <li>Configuring webhooks and integrations</li>
        <li>Deploying your automation scripts</li>
      </ul>
    </div>

    <p><strong>You'll receive another email shortly with:</strong></p>
    <ul>
      <li>Your secure login link</li>
      <li>Access to your admin dashboard</li>
      <li>Next steps for configuration</li>
    </ul>

    <p style="margin-top: 30px;">
      Excited to have you on board!<br>
      <strong>The Syston Team</strong>
    </p>
  </div>
  <div class="footer">
    <p>This is an automated email from your team platform setup.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(
    {
      to: email,
      subject: `⚙️ Setting up ${clubName} - Almost Ready!`,
      html,
    },
    env
  );
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  email: string,
  link: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Verify your email</h1>
  </div>
  <div class="content">
    <h2>You're almost there!</h2>
    <p>Hi there,</p>
    <p>Please verify your email address to complete your account setup and start building your team platform.</p>

    <div style="text-align: center;">
      <a href="${link}" class="button">Verify Email & Start Setup</a>
    </div>

    <p>If you didn't create an account, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply directly.</p>
    <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; word-break: break-all;">${link}</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(
    {
      to: email,
      subject: `Verify your email for Syston`,
      html,
    },
    env
  );
}

/**
 * Send password reset link
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 12px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Reset Your Password</h1>
  </div>
  <div class="content">
    <h2>Password Reset Request</h2>
    <p>Hi there,</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>

    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>

    <div class="warning">
      <strong>⏰ This link expires in 1 hour</strong> and can only be used once for security.
    </div>

    <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>The Team Platform</strong>
    </p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply directly.</p>
    <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; word-break: break-all;">${resetLink}</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(
    {
      to: email,
      subject: `Reset your password`,
      html,
    },
    env
  );
}


/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(
  email: string,
  name: string,
  title: string,
  amount: string,
  dueDate: string,
  link: string,
  clubName: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      padding: 40px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #ef4444;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #dc2626;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .amount {
      font-size: 24px;
      font-weight: bold;
      color: #ef4444;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 Payment Reminder</h1>
  </div>
  <div class="content">
    <h2>Payment Due for ${clubName}</h2>
    <p>Hi ${name},</p>
    <p>This is a friendly reminder that you have a pending payment request.</p>
    
    <div style="text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Amount Due</p>
      <div class="amount">${amount}</div>
      <p style="margin: 0;"><strong>${title}</strong></p>
      <p style="margin: 5px 0 0 0; font-size: 14px;">Due Date: ${dueDate || 'Imminent'}</p>
    </div>

    <div style="text-align: center;">
      <a href="${link}" class="button">Pay Now</a>
    </div>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>${clubName} Admin Team</strong>
    </p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply directly.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(
    {
      to: email,
      subject: `Payment Reminder: ${title}`,
      html,
    },
    env
  );
}

/**
 * Send event reminder email
 */
export async function sendEventReminderEmail(
  email: string,
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  clubName: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .event-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📅 Event Reminder</h1>
  </div>
  <div class="content">
    <h2>Upcoming Event Tomorrow</h2>
    <p>Hi ${name},</p>
    <p>This is a reminder for your upcoming event with ${clubName}:</p>
    
    <div class="event-card">
      <h3 style="margin: 0 0 10px 0; color: #047857;">${eventTitle}</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${eventLocation}</p>
    </div>

    <p>Don't forget to update your RSVP if your plans have changed!</p>

    <p style="margin-top: 30px;">
      See you there,<br>
      <strong>${clubName} Team</strong>
    </p>
  </div>
  <div class="footer">
    <p>This is an automated email. Please do not reply directly.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(
    {
      to: email,
      subject: `Reminder: ${eventTitle} Tomorrow`,
      html,
    },
    env
  );
}
