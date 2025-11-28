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
    return res; // CORS handled by wrapper
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

// Tenant Routes
registerTenantRoutes(router);

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

        // Add extra headers for S3/R2 if needed (simplified for now)
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
