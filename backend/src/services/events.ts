// backend/src/services/events.ts
import type { Env } from "../types";

export type EventType = "training" | "match" | "social";
export interface EventRec {
  id: string;
  type: EventType;
  title: string;
  startUtc: string;
  endUtc?: string;
  location?: { name?: string; lat?: number; lng?: number };
  notes?: string;
  teamId?: string;
  rrule?: string; // optional recurrence
  rsvp_yes_count?: number;
  rsvp_no_count?: number;
  rsvp_maybe_count?: number;
  createdAt: number;
  updatedAt: number;
}

export async function putEvent(env: Env, tenant: string, ev: EventRec) {
  const key = `tenants:${tenant}:events:${ev.id}`;
  await env.KV_IDEMP.put(key, JSON.stringify(ev));
  const idxKey = `tenants:${tenant}:events:index`;
  const existing = (await env.KV_IDEMP.get(idxKey, "json")) as any[] || [];
  const row = { id: ev.id, title: ev.title, type: ev.type, startUtc: ev.startUtc, teamId: ev.teamId };
  const next = [row, ...existing.filter(r => r.id !== ev.id)];
  await env.KV_IDEMP.put(idxKey, JSON.stringify(next.slice(0, 5000)));
}

export async function getEvent(env: Env, tenant: string, eventId: string): Promise<EventRec | null> {
  const key = `tenants:${tenant}:events:${eventId}`;
  return (await env.KV_IDEMP.get(key, "json")) as EventRec | null;
}

export async function deleteEvent(env: Env, tenant: string, eventId: string) {
  await env.KV_IDEMP.delete(`tenants:${tenant}:events:${eventId}`);
  const idxKey = `tenants:${tenant}:events:index`;
  const existing = (await env.KV_IDEMP.get(idxKey, "json")) as any[] || [];
  await env.KV_IDEMP.put(idxKey, JSON.stringify(existing.filter(r => r.id !== eventId)));
}

export async function listEvents(env: Env, tenant: string): Promise<any[]> {
  const idxKey = `tenants:${tenant}:events:index`;
  return (await env.KV_IDEMP.get(idxKey, "json")) as any[] || [];
}

// RSVPs
export async function setRsvp(env: Env, tenant: string, eventId: string, userId: string, rsvp: "yes"|"no"|"maybe") {
  const key = `tenants:${tenant}:events:${eventId}:rsvp:${userId}`;

  // Get previous RSVP to adjust counts
  const previousRsvp = await getRsvp(env, tenant, eventId, userId);

  // Update the RSVP
  await env.KV_IDEMP.put(key, rsvp); // 120 days TTL

  // Update RSVP index
  const indexKey = `tenants:${tenant}:events:${eventId}:rsvps:index`;
  const rsvpList = (await env.KV_IDEMP.get(indexKey, "json")) as {userId: string; status: string}[] || [];
  const existingIndex = rsvpList.findIndex(r => r.userId === userId);
  if (existingIndex >= 0) {
    rsvpList[existingIndex].status = rsvp;
  } else {
    rsvpList.push({ userId, status: rsvp });
  }
  await env.KV_IDEMP.put(indexKey, JSON.stringify(rsvpList));

  // Update event counts
  const event = await getEvent(env, tenant, eventId);
  if (event) {
    // Decrement previous count
    if (previousRsvp === "yes") event.rsvp_yes_count = (event.rsvp_yes_count || 1) - 1;
    else if (previousRsvp === "no") event.rsvp_no_count = (event.rsvp_no_count || 1) - 1;
    else if (previousRsvp === "maybe") event.rsvp_maybe_count = (event.rsvp_maybe_count || 1) - 1;

    // Increment new count
    if (rsvp === "yes") event.rsvp_yes_count = (event.rsvp_yes_count || 0) + 1;
    else if (rsvp === "no") event.rsvp_no_count = (event.rsvp_no_count || 0) + 1;
    else if (rsvp === "maybe") event.rsvp_maybe_count = (event.rsvp_maybe_count || 0) + 1;

    // Ensure counts don't go negative
    event.rsvp_yes_count = Math.max(0, event.rsvp_yes_count || 0);
    event.rsvp_no_count = Math.max(0, event.rsvp_no_count || 0);
    event.rsvp_maybe_count = Math.max(0, event.rsvp_maybe_count || 0);

    event.updatedAt = Date.now();
    await putEvent(env, tenant, event);
  }
}

export async function getRsvp(env: Env, tenant: string, eventId: string, userId: string) {
  const key = `tenants:${tenant}:events:${eventId}:rsvp:${userId}`;
  return (await env.KV_IDEMP.get(key)) as ("yes"|"no"|"maybe"|null);
}

export async function deleteRsvp(env: Env, tenant: string, eventId: string, userId: string) {
  const key = `tenants:${tenant}:events:${eventId}:rsvp:${userId}`;

  // Get current RSVP to adjust counts
  const currentRsvp = await getRsvp(env, tenant, eventId, userId);

  // Delete the RSVP
  await env.KV_IDEMP.delete(key);

  // Update RSVP index
  const indexKey = `tenants:${tenant}:events:${eventId}:rsvps:index`;
  const rsvpList = (await env.KV_IDEMP.get(indexKey, "json")) as {userId: string; status: string}[] || [];
  const filteredList = rsvpList.filter(r => r.userId !== userId);
  await env.KV_IDEMP.put(indexKey, JSON.stringify(filteredList));

  // Update event counts
  if (currentRsvp) {
    const event = await getEvent(env, tenant, eventId);
    if (event) {
      // Decrement count
      if (currentRsvp === "yes") event.rsvp_yes_count = Math.max(0, (event.rsvp_yes_count || 1) - 1);
      else if (currentRsvp === "no") event.rsvp_no_count = Math.max(0, (event.rsvp_no_count || 1) - 1);
      else if (currentRsvp === "maybe") event.rsvp_maybe_count = Math.max(0, (event.rsvp_maybe_count || 1) - 1);

      event.updatedAt = Date.now();
      await putEvent(env, tenant, event);
    }
  }
}

// Check-ins (simple append-only set compressed as JSON)
export async function addCheckin(env: Env, tenant: string, eventId: string, userId: string) {
  const key = `tenants:${tenant}:events:${eventId}:checkins`;
  const list = (await env.KV_IDEMP.get(key, "json")) as {userId:string;ts:number}[] || [];
  list.push({ userId, ts: Date.now() });
  await env.KV_IDEMP.put(key, JSON.stringify(list), { expirationTtl: 60 * 60 * 24 * 180 });
}
export async function listCheckins(env: Env, tenant: string, eventId: string) {
  const key = `tenants:${tenant}:events:${eventId}:checkins`;
  return (await env.KV_IDEMP.get(key, "json")) as {userId:string;ts:number}[] || [];
}

// List all RSVPs for an event (stored in an index for efficient retrieval)
export async function listRsvps(env: Env, tenant: string, eventId: string): Promise<{userId: string; status: "yes"|"no"|"maybe"}[]> {
  const key = `tenants:${tenant}:events:${eventId}:rsvps:index`;
  return (await env.KV_IDEMP.get(key, "json")) as {userId: string; status: "yes"|"no"|"maybe"}[] || [];
}
