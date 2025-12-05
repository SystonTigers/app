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
import {
    handleAnalyzeMistakes,
    handleGetMistakes,
    handleGenerateDrills,
    handleGenerateSession,
    handleSaveTrainingSession,
    handleGetTrainingSessions,
    handleGetTrainingSession,
    handleDeleteTrainingSession,
    handleGetJobStatus
} from "./routes/coaching";
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
import { handleMatchUpdates, handleCreateMatchEvent } from "./routes/matches";
router.post("/api/:v/matches/:id/events", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleCreateMatchEvent(req, env, corsHdrs, params.id);
});
router.get("/api/:v/matches/:id/updates", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleMatchUpdates(req, env, corsHdrs, params.id);
});

// Chat Routes
import {
    handleListRooms,
    handleSendMessage,
    handleGetHistory,
    handleTyping,
    handleCreateRoom
} from "./routes/chat";
router.get("/api/:v/chat/rooms", (req, env, corsHdrs) => handleListRooms(req, env, corsHdrs));
router.post("/api/:v/chat/rooms", (req, env, corsHdrs) => handleCreateRoom(req, env, corsHdrs));
router.post("/api/:v/chat/:roomId/send", (req, env, corsHdrs) => handleSendMessage(req, env, corsHdrs));
router.get("/api/:v/chat/:roomId/history", (req, env, corsHdrs) => handleGetHistory(req, env, corsHdrs));
router.post("/api/:v/chat/:roomId/typing", (req, env, corsHdrs) => handleTyping(req, env, corsHdrs));

// Gallery Routes
import {
    handlePhotoUpload,
    handleListPhotos,
    handleGetPhoto,
    handleDeletePhoto,
    handleCreateAlbum,
    handleListAlbums,
    handleDeleteAlbum
} from "./routes/gallery";
router.post("/api/:v/gallery/upload", (req, env, corsHdrs) => handlePhotoUpload(req, env, corsHdrs));
router.get("/api/:v/gallery/photos", (req, env, corsHdrs) => handleListPhotos(req, env, corsHdrs));
router.get("/api/:v/gallery/photos/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetPhoto(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/gallery/photos/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeletePhoto(req, env, corsHdrs, params.id);
});
router.post("/api/:v/gallery/albums", (req, env, corsHdrs) => handleCreateAlbum(req, env, corsHdrs));
router.get("/api/:v/gallery/albums", (req, env, corsHdrs) => handleListAlbums(req, env, corsHdrs));
router.delete("/api/:v/gallery/albums/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteAlbum(req, env, corsHdrs, params.id);
});

// Training Routes
import {
    handleCreateSession,
    handleListSessions,
    handleDeleteSession,
    handleCreateDrill,
    handleListDrills,
    handleDeleteDrill,
    handleAddDrillToSession,
    handleGetSessionDrills
} from "./routes/training";
router.post("/api/:v/training/sessions", (req, env, corsHdrs) => handleCreateSession(req, env, corsHdrs));
router.get("/api/:v/training/sessions", (req, env, corsHdrs) => handleListSessions(req, env, corsHdrs));
router.delete("/api/:v/training/sessions/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteSession(req, env, corsHdrs, params.id);
});
router.post("/api/:v/training/drills", (req, env, corsHdrs) => handleCreateDrill(req, env, corsHdrs));
router.get("/api/:v/training/drills", (req, env, corsHdrs) => handleListDrills(req, env, corsHdrs));
router.delete("/api/:v/training/drills/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteDrill(req, env, corsHdrs, params.id);
});
router.post("/api/:v/training/session-drills", (req, env, corsHdrs) => handleAddDrillToSession(req, env, corsHdrs));
router.get("/api/:v/training/sessions/:id/drills", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetSessionDrills(req, env, corsHdrs, params.id);
});

// Shop Routes
import {
    handleCreateProduct,
    handleListProducts,
    handleGetProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handlePrintifySync,
    handlePublicListProducts
} from "./routes/shop";
router.post("/api/:v/shop/products", (req, env, corsHdrs) => handleCreateProduct(req, env, corsHdrs));
router.get("/api/:v/shop/products", (req, env, corsHdrs) => handleListProducts(req, env, corsHdrs));
router.get("/api/:v/shop/products/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetProduct(req, env, corsHdrs, params.id);
});
router.put("/api/:v/shop/products/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleUpdateProduct(req, env, corsHdrs, params.id);
});
router.delete("/api/:v/shop/products/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteProduct(req, env, corsHdrs, params.id);
});
router.post("/api/:v/shop/printify/sync", (req, env, corsHdrs) => handlePrintifySync(req, env, corsHdrs));

// MOTM Voting Routes
import {
    handleInitVote,
    handleCastVote,
    handleGetResults
} from "./routes/motm";
router.get("/api/:v/motm/:matchId", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleInitVote(req, env, corsHdrs, params.matchId);
});
router.post("/api/:v/motm/:matchId/vote", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleCastVote(req, env, corsHdrs, params.matchId);
});
router.get("/api/:v/motm/:matchId/results", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleGetResults(req, env, corsHdrs, params.matchId);
});

// Social Media Routes
import {
    handleCreatePost as handleCreateSocialPost,
    handleListPosts as handleListSocialPosts,
    handleDeletePost as handleDeleteSocialPost,
    handleUpdateSocialConfig,
    handleGetSocialConfig
} from "./routes/social";
router.post("/api/:v/social/posts", (req, env, corsHdrs) => handleCreateSocialPost(req, env, corsHdrs));
router.get("/api/:v/social/posts", (req, env, corsHdrs) => handleListSocialPosts(req, env, corsHdrs));
router.delete("/api/:v/social/posts/:id", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handleDeleteSocialPost(req, env, corsHdrs, params.id);
});
router.put("/api/:v/social/config", (req, env, corsHdrs) => handleUpdateSocialConfig(req, env, corsHdrs));
router.get("/api/:v/social/config", (req, env, corsHdrs) => handleGetSocialConfig(req, env, corsHdrs));

// Player Photo Routes
import { handlePlayerPhotoUpload, handlePlayerPhotoDelete } from "./routes/players";
router.post("/api/:v/players/:id/photo", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handlePlayerPhotoUpload(req, env, corsHdrs);
});
router.delete("/api/:v/players/:id/photo", (req, env, corsHdrs) => {
    const params = (req as any).params || {};
    return handlePlayerPhotoDelete(req, env, corsHdrs, params.id);
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

// ===== AI ASSISTANT COACH ROUTES =====

// Analyze video for coaching opportunities
router.post("/api/:v/videos/:id/analyze-mistakes", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleAnalyzeMistakes(req, env, corsHdrs, params.id);
});

// Get detected mistakes for a video
router.get("/api/:v/videos/:id/mistakes", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleGetMistakes(req, env, corsHdrs, params.id);
});

// Generate training drills from mistakes
router.post("/api/:v/coaching/generate-drills", (req, env, corsHdrs, requestId) =>
    handleGenerateDrills(req, env, corsHdrs)
);

// Generate complete training session
router.post("/api/:v/coaching/generate-session", (req, env, corsHdrs, requestId) =>
    handleGenerateSession(req, env, corsHdrs)
);

// Save training session plan
router.post("/api/:v/coaching/sessions", (req, env, corsHdrs, requestId) =>
    handleSaveTrainingSession(req, env, corsHdrs)
);

// Get all training sessions
router.get("/api/:v/coaching/sessions", (req, env, corsHdrs, requestId) =>
    handleGetTrainingSessions(req, env, corsHdrs)
);

// Get specific training session
router.get("/api/:v/coaching/sessions/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleGetTrainingSession(req, env, corsHdrs, params.id);
});

// Delete training session
router.delete("/api/:v/coaching/sessions/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleDeleteTrainingSession(req, env, corsHdrs, params.id);
});


// Get coaching job status (for polling)
router.get("/api/:v/coaching/jobs/:id", (req, env, corsHdrs, requestId) => {
    const params = (req as any).params || {};
    return handleGetJobStatus(req, env, corsHdrs, params.id);
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
