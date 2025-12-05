/**
 * Mock Email Service (Resend)
 *
 * Use this mock in tests to avoid real email API calls.
 * Import with: vi.mock("../lib/email");
 */

import { vi } from "vitest";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Store sent emails for verification
const sentEmails: Array<EmailOptions & { timestamp: number }> = [];

export const mockSendEmail = vi.fn().mockImplementation(
  async (options: EmailOptions): Promise<EmailResult> => {
    sentEmails.push({ ...options, timestamp: Date.now() });
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }
);

export const sendEmail = mockSendEmail;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all emails sent during test
 */
export function getSentEmails(): Array<EmailOptions & { timestamp: number }> {
  return [...sentEmails];
}

/**
 * Get emails sent to a specific address
 */
export function getEmailsTo(email: string): Array<EmailOptions> {
  return sentEmails.filter((e) => {
    const recipients = Array.isArray(e.to) ? e.to : [e.to];
    return recipients.includes(email);
  });
}

/**
 * Get emails with a specific subject
 */
export function getEmailsWithSubject(subject: string): Array<EmailOptions> {
  return sentEmails.filter((e) => e.subject.includes(subject));
}

/**
 * Clear sent emails history
 */
export function clearSentEmails(): void {
  sentEmails.length = 0;
}

/**
 * Assert that an email was sent
 */
export function assertEmailSent(options: Partial<EmailOptions>): void {
  const found = sentEmails.some((email) => {
    const toMatches =
      !options.to ||
      (Array.isArray(email.to)
        ? email.to.includes(options.to as string)
        : email.to === options.to);
    const subjectMatches =
      !options.subject || email.subject.includes(options.subject);
    const htmlMatches = !options.html || email.html.includes(options.html);

    return toMatches && subjectMatches && htmlMatches;
  });

  if (!found) {
    throw new Error(
      `Expected email matching ${JSON.stringify(options)} to be sent`
    );
  }
}

/**
 * Assert that no emails were sent
 */
export function assertNoEmailsSent(): void {
  if (sentEmails.length > 0) {
    throw new Error(
      `Expected no emails to be sent, but ${sentEmails.length} were sent`
    );
  }
}

/**
 * Set up email mock to fail
 */
export function mockEmailFailure(error: string = "Email send failed"): void {
  mockSendEmail.mockRejectedValue(new Error(error));
}

/**
 * Reset email mock to default behavior
 */
export function resetEmailMock(): void {
  mockSendEmail.mockReset();
  clearSentEmails();
  mockSendEmail.mockImplementation(async (options: EmailOptions) => {
    sentEmails.push({ ...options, timestamp: Date.now() });
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  });
}
