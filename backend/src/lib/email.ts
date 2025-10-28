/**
 * Email Service - Resend Integration
 * Sends transactional emails (magic links, welcome emails, etc.)
 */

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
    console.log('[EMAIL] No RESEND_API_KEY configured - logging email instead:');
    console.log('[EMAIL] To:', options.to);
    console.log('[EMAIL] Subject:', options.subject);
    console.log('[EMAIL] Body:', options.html);
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
      console.error('[EMAIL] Resend API error:', errorData);
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
    console.error('[EMAIL] Send failed:', error);
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
