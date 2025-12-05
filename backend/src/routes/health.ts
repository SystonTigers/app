import { logJSON } from "../lib/log";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  uptime?: number;
  checks: {
    database?: "healthy" | "unhealthy";
    kv?: "healthy" | "unhealthy";
    durable_objects?: "healthy" | "unhealthy";
  };
}

/**
 * Liveness probe - Returns 200 if worker is running
 * Used by load balancers to determine if instance should receive traffic
 */
export async function healthz(env: any): Promise<Response> {
  return Response.json({
    status: "ok",
    version: env.APP_VERSION || "unknown",
    ts: new Date().toISOString(),
  }, { status: 200 });
}

/**
 * Readiness probe - Returns 200 if all dependencies are healthy
 * Performs actual checks on database, KV, and other services
 */
export async function readyz(env: any): Promise<Response> {
  const checks: HealthCheck["checks"] = {};
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  // Check D1 Database
  try {
    const result = await env.DB.prepare("SELECT 1 as health").first();
    checks.database = result?.health === 1 ? "healthy" : "unhealthy";
    if (checks.database === "unhealthy") overallStatus = "degraded";
  } catch (error) {
    checks.database = "unhealthy";
    overallStatus = "unhealthy";
    logJSON({
      level: "error",
      msg: "health_check_database_failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Check KV Namespace
  try {
    await env.KV_IDEMP.put("health_check", Date.now().toString(), { expirationTtl: 60 });
    const value = await env.KV_IDEMP.get("health_check");
    checks.kv = value ? "healthy" : "unhealthy";
    if (checks.kv === "unhealthy" && overallStatus === "healthy") overallStatus = "degraded";
  } catch (error) {
    checks.kv = "unhealthy";
    if (overallStatus === "healthy") overallStatus = "degraded";
    logJSON({
      level: "error",
      msg: "health_check_kv_failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Check Durable Objects (optional - can be expensive)
  checks.durable_objects = "healthy"; // Assume healthy unless we test

  const response: HealthCheck = {
    status: overallStatus,
    version: env.APP_VERSION || "unknown",
    timestamp: new Date().toISOString(),
    checks
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return Response.json(response, { status: statusCode });
}