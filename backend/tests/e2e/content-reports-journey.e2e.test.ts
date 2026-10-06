/**
 * Journey: a parent reports a Team talk comment from the app, staff see it
 * (with who wrote it and which conversation), and "Remove it" really takes
 * the comment and its replies down. Reporting twice is one report;
 * reporting without signing in, or something that isn't at the club, fails.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Reported posts", () => {
  it("lets members report, staff review and remove", async () => {
    const coach = await registerAdmin("rep-coach", "coach");
    const parent = await registerMember("rep-parent");
    const writer = await registerMember("rep-writer");

    const talk = await call("/api/v1/discussions", { token: writer.token, body: { category: "general", title: "Saturday" } });
    const talkId = talk.data.data.id as string;
    const bad = await call(`/api/v1/discussions/${talkId}/comments`, { token: writer.token, body: { content: "Something nasty" } });
    const commentId = bad.data.data.id as string;
    await call(`/api/v1/discussions/${talkId}/comments`, { token: coach.token, body: { content: "Please don't", parent_comment_id: commentId } });

    // Signed out, or something not at the club: refused
    expect((await call("/api/v1/content/report", { body: { contentType: "comment", contentId: commentId, reason: "harassment" } })).status).toBe(401);
    expect((await call("/api/v1/content/report", { token: parent.token, body: { contentType: "comment", contentId: "nope", reason: "harassment" } })).status).toBe(404);
    expect((await call("/api/v1/content/report", { token: parent.token, body: { contentType: "comment", contentId: commentId, reason: "made_up" } })).status).toBe(400);

    const first = await call("/api/v1/content/report", { token: parent.token, body: { contentType: "comment", contentId: commentId, reason: "harassment", details: "Aimed at my son" } });
    expect(first.status, JSON.stringify(first.data)).toBe(201);
    const again = await call("/api/v1/content/report", { token: parent.token, body: { contentType: "comment", contentId: commentId, reason: "harassment" } });
    expect(again.data.data.reportId).toBe(first.data.data.reportId);

    // Members can't see reports; staff can, with the comment and its author
    expect((await call("/api/v1/content/reports", { token: parent.token })).status).toBe(403);
    const list = await call("/api/v1/content/reports?status=pending", { token: coach.token });
    expect(list.status).toBe(200);
    const mine = list.data.data.reports.filter((r: any) => r.content_id === commentId);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ content_preview: "Something nasty", content_author: "rep-writer", discussion_id: talkId, details: "Aimed at my son" });

    // Remove it: the comment and its reply go, the report is closed
    const removed = await call(`/api/v1/content/reports/${mine[0].id}`, { method: "PUT", token: coach.token, body: { status: "actioned", action: "removed" } });
    expect(removed.status, JSON.stringify(removed.data)).toBe(200);
    const thread = await call(`/api/v1/discussions/${talkId}`, { token: coach.token });
    expect(thread.data.data.comments).toHaveLength(0);
    const after = await call("/api/v1/content/reports?status=pending", { token: coach.token });
    expect(after.data.data.reports.some((r: any) => r.content_id === commentId)).toBe(false);
    const done = await call("/api/v1/content/reports?status=actioned", { token: coach.token });
    expect(done.data.data.reports.find((r: any) => r.id === mine[0].id)?.action_taken).toBe("removed");

    // Dismissing leaves the conversation alone
    const conv = await call("/api/v1/content/report", { token: parent.token, body: { contentType: "message", contentId: talkId, reason: "other" } });
    await call(`/api/v1/content/reports/${conv.data.data.reportId}`, { method: "PUT", token: coach.token, body: { status: "dismissed", action: "no_action" } });
    expect((await call(`/api/v1/discussions/${talkId}`, { token: coach.token })).status).toBe(200);
  });
});
