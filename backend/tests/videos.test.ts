
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { unstable_dev } from "wrangler";
import type { Unstable_DevWorker } from "wrangler";

describe("Video Routes", () => {
    let worker: Unstable_DevWorker;
    let token: string;
    let tenantId: string;

    beforeAll(async () => {
        worker = await unstable_dev("src/index.ts", {
            experimental: { disableExperimentalWarning: true },
        });

        // Register a tenant to get a token
        const regRes = await worker.fetch("/api/v1/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: `video-test-${Date.now()}@example.com`,
                password: "Password123!",
                teamName: "Video Test Team"
            })
        });
        const regData = await regRes.json() as any;
        token = regData.data.token;
        tenantId = regData.data.tenant.id;
    });

    afterAll(async () => {
        await worker.stop();
    });

    it("should upload a video", async () => {
        const formData = new FormData();
        const videoBlob = new Blob(["fake video content"], { type: "video/mp4" });
        formData.append("video", videoBlob, "test-video.mp4");

        const res = await worker.fetch("/api/v1/videos/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json() as any;
        expect(res.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.video).toBeDefined();
        expect(data.data.video.filename).toBe("test-video.mp4");
    });

    it("should list videos", async () => {
        const res = await worker.fetch("/api/v1/videos", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json() as any;
        expect(res.status).toBe(200);
        expect(data.data.videos.length).toBeGreaterThan(0);
    });
});
