import { describe, it, expect, vi, afterEach } from "vitest";
import { renderEmail, sendEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../email";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderEmail", () => {
  it("uses the Boost Huddle layout and escapes anything a user typed", () => {
    const { html, text } = renderEmail({
      heading: "Welcome, <script>alert(1)</script> FC",
      paragraphs: ["Tom & Jerry's club"],
      button: { label: "Open", url: "https://example.com/?a=1&b=2" },
    });
    expect(html).toContain(">Boost Huddle</span>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Tom &amp; Jerry&#39;s club");
    expect(html).toContain('href="https://example.com/?a=1&amp;b=2"');
    expect(text).toContain("Open: https://example.com/?a=1&b=2");
    expect(text).toContain("The Boost Huddle team");
  });
});

describe("sendEmail", () => {
  it("sends from Boost Huddle with a plain-text version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }),
    );
    const result = await sendWelcomeEmail("owner@example.com", "Test FC", "https://app.example/dash", {
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "hello@boosthuddle.example",
    });
    expect(result).toEqual({ success: true, messageId: "msg_1" });
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.from).toBe("Boost Huddle <hello@boosthuddle.example>");
    expect(body.subject).toBe("Welcome to Boost Huddle, Test FC");
    expect(body.text).toContain("https://app.example/dash");
  });

  it("without an API key, logs only who and what, never the link", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await sendPasswordResetEmail("user@example.com", "https://x.example/reset?token=SECRET", {});
    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const logged = [...log.mock.calls, ...warn.mock.calls].flat().join(" ");
    expect(logged).not.toContain("SECRET");
  });

  it("reports a Resend failure instead of throwing", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad domain", { status: 403 }));
    const result = await sendEmail({ to: "a@example.com", subject: "Hi", html: "<p>Hi</p>" }, { RESEND_API_KEY: "re_test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("403");
  });
});
