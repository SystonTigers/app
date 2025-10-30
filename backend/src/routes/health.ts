export async function healthz(env: any) {
  return Response.json({
    status: "ok",
    version: env.APP_VERSION || "unknown",
    ts: new Date().toISOString(),
  }, { status: 200 });
}

// Keep readiness lightweight; touch bindings only if cheap.
export async function readyz(env: any) {
  return Response.json({
    status: "ready",
    version: env.APP_VERSION || "unknown",
    ts: new Date().toISOString(),
  }, { status: 200 });
}
