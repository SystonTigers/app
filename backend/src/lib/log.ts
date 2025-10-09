export function logJSON(event: {
  level: "info"|"warn"|"error",
  msg: string,
  requestId?: string,
  path?: string,
  status?: number,
  ms?: number,
  tenant?: string
}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), ...event }));
}

export function newRequestId() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}
