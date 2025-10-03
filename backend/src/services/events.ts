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
  await env.KV_IDEMP.put(key, rsvp, { expirationTtl: 60 * 60 * 24 * 120 }); // 120 days TTL
}
export async function getRsvp(env: Env, tenant: string, eventId: string, userId: string) {
  const key = `tenants:${tenant}:events:${eventId}:rsvp:${userId}`;
  return (await env.KV_IDEMP.get(key)) as ("yes"|"no"|"maybe"|null);
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
