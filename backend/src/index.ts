import { Router } from "itty-router";
import { handlePublicTenantRequest } from "./routes/public";
import { errorHandler } from "./middleware/errorHandler";
import { corsHeaders, isPreflight } from "./middleware/cors";
import { newRequestId, logJSON } from "./lib/log";
import { withSecurity } from "./middleware/securityHeaders";
import { healthz, readyz } from "./routes/health";
import { registerTenantRoutes } from "./routes/tenants";
import {
    handleAuthRegister,
    handleAuthLogin,
    handleSetPassword,
    handleCheckPasswordStatus
} from "./routes/auth";
import {
    signupStart,
    signupBrand,
    signupStarterMake,
    signupProConfirm,
    signupVerifyPromo
} from "./routes/signup";
import {
    listTenants,
    getTenant,
    updateTenant,
    listPromoCodes,
    createPromoCode,
    deactivateTenant,
    deleteTenant,
    deactivatePromoCode,
    getAdminStats,
    listUsers,
    upsertPromoCode
} from "./routes/admin";
import {
    handleProvisionQueue,
    handleProvisionStatus,
    handleTenantOverview,
    handleProvisionRetry
} from "./routes/provisioning";
import { handleMagicStart, handleMagicVerify } from "./routes/magic";
import { handleDevAdminJWT, handleDevMagicLink, handleDevInfo } from "./routes/devAuth";
import { getUsage, incrementUsage } from "./routes/usage";
import {
    handleSecuritySummary,
    handleSecurityMetrics,
    handleSecurityEvents,
    handleEventTypes,
    handleSecurityExport
} from "./routes/securityDashboard";
import {
    handleVideoUpload,
    handleVideoList,
    handleVideoGet,
    handleVideoStatus,
    handleVideoProcess,
    handleVideoDelete,
    handleVideoStream,
    handleVideoClips
} from "./routes/videos";

// Export Durable Objects
export { TenantRateLimiter } from "./do/rateLimiter";
export { VotingRoom } from "./do/votingRoom";
export { MatchRoom } from "./do/matchRoom";
export { ChatRoom } from "./do/chatRoom";
export { GeoFenceManager } from "./do/geoFenceManager";
export { Provisioner } from "./do/provisioner";

const router = Router();

// Health Checks
router.get("/healthz", async (req, env) => {
    const res = await healthz(env);
    return res;
});
router.get("/readyz", async (req, env) => {
    const res = await readyz(env);
    return res;
});

// Public Routes
router.get("/public/*", async (req, env, corsHdrs, requestId) => {
    return handlePublicTenantRequest(req, env, new URL(req.url), corsHdrs, requestId);
});

// Auth Routes
router.post("/api/:v/auth/register", (req, env, corsHdrs) => handleAuthRegister(req, env, corsHdrs));
router.post("/api/:v/auth/login", (req, env, corsHdrs) => handleAuthLogin(req, env, corsHdrs));
router.post("/api/:v/auth/set-password", (req, env, corsHdrs) => handleSetPassword(req, env, corsHdrs));
router.get("/api/:v/auth/password-status", (req, env, corsHdrs) => handleCheckPasswordStatus(req, env, corsHdrs));

// Magic Link Routes
router.post("/api/:v/magic/start", (req, env, corsHdrs) => handleMagicStart(req, env, corsHdrs));
router.post("/api/:v/magic/verify", (req, env, corsHdrs) => handleMagicVerify(req, env, corsHdrs));

// Tenant Routes
registerTenantRoutes(router);

// Signup Routes
router.post("/public/signup/start", (req, env, corsHdrs, requestId) => signupStart(req, env, requestId, corsHdrs));
router.post("/public/signup/brand", (req, env, corsHdrs, requestId) => signupBrand(req, env, requestId, corsHdrs));
router.post("/public/signup/starter/make", (req, env, corsHdrs, requestId) => signupStarterMake(req, env, requestId, corsHdrs));
router.post("/public/signup/pro/confirm", (req, env, corsHdrs, requestId) => signupProConfirm(req, env, requestId, corsHdrs));
router.post("/public/signup/verify-promo", (req, env, corsHdrs, requestId) => signupVerifyPromo(req, env, requestId, corsHdrs));

// Admin Routes
router.get("/api/:v/admin/tenants", (req, env, corsHdrs, requestId) => listTenants(req, env, requestId, corsHdrs));
router.get("/api/:v/admin/tenants/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return getTenant(req, env, requestId, corsHdrs, params.id);
});
router.patch("/api/:v/admin/tenants/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return updateTenant(req, env, requestId, corsHdrs, params.id);
});
router.post("/api/:v/admin/tenants/:id/deactivate", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deactivateTenant(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/admin/tenants/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deleteTenant(req, env, requestId, corsHdrs, params.id);
});
router.get("/api/:v/admin/promo-codes", (req, env, corsHdrs, requestId) => listPromoCodes(req, env, requestId, corsHdrs));
router.post("/api/:v/admin/promo-codes", (req, env, corsHdrs, requestId) => createPromoCode(req, env, requestId, corsHdrs));
router.post("/api/:v/admin/promo/upsert", (req, env, corsHdrs, requestId) => upsertPromoCode(req, env, requestId, corsHdrs));
router.post("/api/:v/admin/promo-codes/:code/deactivate", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deactivatePromoCode(req, env, requestId, corsHdrs, params.code);
});
router.get("/api/:v/admin/stats", (req, env, corsHdrs, requestId) => getAdminStats(req, env, requestId, corsHdrs));
router.get("/api/:v/admin/users", (req, env, corsHdrs, requestId) => listUsers(req, env, requestId, corsHdrs));
// Alias for legacy tests
router.get("/api/:v/users", (req, env, corsHdrs, requestId) => listUsers(req, env, requestId, corsHdrs));

// Provisioning Routes
router.post("/internal/provision/queue", (req, env, corsHdrs, requestId) => handleProvisionQueue(req, env));
router.get("/api/:v/tenants/:id/provision-status", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleProvisionStatus(req, env, params.id);
});
router.get("/api/:v/tenants/:id/overview", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleTenantOverview(req, env, params.id);
});
router.post("/internal/provision/retry", (req, env, corsHdrs, requestId) => {
    return handleProvisionRetry(req, env);
});

// Usage Routes
router.get("/api/:v/usage", (req, env, corsHdrs, requestId) => getUsage(req, env, requestId, corsHdrs));
router.post("/api/:v/usage/increment", (req, env, corsHdrs, requestId) => incrementUsage(req, env, requestId, corsHdrs));

// Security Dashboard Routes
router.get("/api/:v/security/summary", (req, env, corsHdrs, requestId) => handleSecuritySummary(req, env, corsHdrs));
router.get("/api/:v/security/metrics", (req, env, corsHdrs, requestId) => handleSecurityMetrics(req, env, corsHdrs));
router.get("/api/:v/security/events", (req, env, corsHdrs, requestId) => handleSecurityEvents(req, env, corsHdrs));
router.get("/api/:v/security/event-types", (req, env, corsHdrs, requestId) => handleEventTypes(req, env, corsHdrs));
router.get("/api/:v/security/export", (req, env, corsHdrs, requestId) => handleSecurityExport(req, env, corsHdrs));

// Push Routes
export * from "./services/fixtures";
import { handlePushRegister, handlePushSend, handlePushBroadcast } from "./routes/push";
router.post("/api/:v/push/register", (req, env) => handlePushRegister(req, env));
router.post("/api/:v/push/send", (req, env) => handlePushSend(req, env));
router.post("/api/:v/push/broadcast", (req, env) => handlePushBroadcast(req, env));

// Events Routes
import { createEvent, getEvent, rsvpEvent, getEventRsvps, cancelRsvp, listEvents, deleteEvent } from "./routes/events";
router.post("/api/:v/events", (req, env, corsHdrs, requestId) => createEvent(req, env, requestId, corsHdrs));
router.get("/api/:v/events", (req, env, corsHdrs, requestId) => listEvents(req, env, requestId, corsHdrs));
router.get("/api/:v/events/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return getEvent(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/events/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return deleteEvent(req, env, requestId, corsHdrs, params.id);
});
router.post("/api/:v/events/:id/rsvp", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return rsvpEvent(req, env, requestId, corsHdrs, params.id);
});
router.get("/api/:v/events/:id/rsvps", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return getEventRsvps(req, env, requestId, corsHdrs, params.id);
});
router.delete("/api/:v/events/:id/rsvp", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return cancelRsvp(req, env, requestId, corsHdrs, params.id);
});

// Match Routes
import { handleMatchUpdates } from "./routes/matches";
router.get("/api/:v/matches/:id/updates", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleMatchUpdates(req, env, corsHdrs, params.id);
});

// Video Routes
router.post("/api/:v/videos/upload", (req, env, corsHdrs, requestId) => handleVideoUpload(req, env, corsHdrs));
router.get("/api/:v/videos", (req, env, corsHdrs, requestId) => handleVideoList(req, env, corsHdrs));
router.get("/api/:v/videos/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoGet(req, env, corsHdrs, params.id);
});
router.get("/api/:v/videos/:id/status", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoStatus(req, env, corsHdrs, params.id);
});
router.post("/api/:v/videos/:id/process", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoProcess(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/videos/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoDelete(req, env, corsHdrs, params.id);
});
router.get("/api/:v/videos/:id/clips", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleVideoClips(req, env, corsHdrs, params.id);
});
router.get("/api/:v/videos/:id/stream", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleVideoStream(req, env, corsHdrs, params.id);
});

// Squad Routes
import { handleUpdateSquad } from "./routes/squad";
router.post("/api/:v/squad", (req, env, corsHdrs) => handleUpdateSquad(req, env, corsHdrs));

// Content Routes
import {
    handleCreateFixture, handleDeleteFixture,
    handleCreateResult, handleDeleteResult,
    handleCreatePost, handleDeletePost,
    handleUpdateTable
} from "./routes/content";

router.post("/api/:v/fixtures", (req, env, corsHdrs) => handleCreateFixture(req, env, corsHdrs));
router.delete("/api/:v/fixtures/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteFixture(req, env, corsHdrs, params.id);
});

router.post("/api/:v/results", (req, env, corsHdrs) => handleCreateResult(req, env, corsHdrs));
router.delete("/api/:v/results/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteResult(req, env, corsHdrs, params.id);
});

router.post("/api/:v/feed", (req, env, corsHdrs) => handleCreatePost(req, env, corsHdrs));
router.delete("/api/:v/feed/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeletePost(req, env, corsHdrs, params.id);
});

router.post("/api/:v/table", (req, env, corsHdrs) => handleUpdateTable(req, env, corsHdrs));

// Dev Auth Routes (only in development)
router.post("/dev/admin-jwt", (req, env) => handleDevAdminJWT(req, env));
router.post("/dev/magic-link", (req, env) => handleDevMagicLink(req, env));
router.get("/dev/info", (req, env) => handleDevInfo(req, env));

// Default 404
router.all("*", () => new Response("Not Found", { status: 404 }));

function mergeHeaders(base: Headers, extra?: HeadersInit) {
    const merged = new Headers(base);
    if (extra) {
        const addition = new Headers(extra);
        addition.forEach((value, key) => merged.set(key, value));
    }
    return merged;
}

function respondWithCors(res: Response, base: Headers) {
    const headers = mergeHeaders(base, res.headers);
    return new Response(res.body, withSecurity({ status: res.status, headers }));
}

export default {
    async fetch(req: Request, env: any, ctx: ExecutionContext): Promise<Response> {
        const requestId = newRequestId();
        const origin = req.headers.get("Origin");
        const corsHdrs = corsHeaders(origin, env);

        corsHdrs.set("Access-Control-Expose-Headers", "X-Request-Id, X-Release");
        corsHdrs.set("X-Request-Id", requestId);

        if (isPreflight(req)) {
            return new Response(null, withSecurity({ status: 204, headers: corsHdrs }));
        }

        try {
            const response = await router.handle(req, env, corsHdrs, requestId);
            if (response instanceof Response) {
                return respondWithCors(response, corsHdrs);
            }
            return respondWithCors(new Response("Internal Error", { status: 500 }), corsHdrs);
        } catch (err: any) {
            const errorResponse = errorHandler(err, env, requestId);
            return respondWithCors(errorResponse, corsHdrs);
        }
    }
};
