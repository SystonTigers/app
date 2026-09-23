import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

/**
 * E2E: Club news feed - staff post from the app, everyone sees it on Home.
 */
describe("E2E: News Feed Journey", () => {
  it("staff post news from the app and members see it newest first", async () => {
    const admin = await registerAdmin("news-admin");
    const parent = await registerMember("news-parent");

    // Mobile composer sends content only
    const first = await call("/api/v1/feed/create", { token: admin.token, body: { content: "Training moved to 6pm tonight", channels: { app_feed: true } } });
    expect(first.status).toBe(200);
    // Web admin sends title/author too
    const second = await call("/api/v1/feed", { token: admin.token, body: { title: "Match report", content: "Great win 3-1!", author: "Coach" } });
    expect(second.status).toBe(200);

    const feed = await call("/api/v1/feed?page=1&limit=10", { token: parent.token });
    expect(feed.status).toBe(200);
    const posts = feed.data.data as any[];
    const ours = posts.filter((p) => [first.data.id, second.data.id].includes(p.id));
    expect(ours).toHaveLength(2);
    expect(ours.find((p) => p.id === first.data.id)).toMatchObject({ title: "Training moved to 6pm tonight", type: "news" });
    // Newest first
    expect(posts.findIndex((p) => p.id === second.data.id)).toBeLessThan(posts.findIndex((p) => p.id === first.data.id));
  });

  it("parents can read but not post", async () => {
    const parent = await registerMember("news-readonly");
    const res = await call("/api/v1/feed/create", { token: parent.token, body: { content: "hello" } });
    expect(res.status).toBe(403);
  });

  it("rejects an empty post", async () => {
    const admin = await registerAdmin("news-empty");
    const res = await call("/api/v1/feed/create", { token: admin.token, body: { content: "   " } });
    expect(res.status).toBe(400);
  });

  it("requires sign-in to read the feed", async () => {
    expect((await call("/api/v1/feed")).status).toBe(401);
  });
});
