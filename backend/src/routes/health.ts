declare const APP_VERSION: string;

export async function healthz() {
  return Response.json({
    status: "ok",
    version: APP_VERSION,
    ts: new Date().toISOString(),
  }, { status: 200 });
}

// Keep readiness lightweight; touch bindings only if cheap.
export async function readyz(_env: unknown) {
  return Response.json({
    status: "ready",
    version: APP_VERSION,
    ts: new Date().toISOString(),
  }, { status: 200 });
}
