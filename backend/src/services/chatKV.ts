// backend/src/services/chatKV.ts
import { kvGetJSON, kvPutJSON, kvListJSON, assert, id } from "./util";
import type { Env } from "../types";

export type RoomType = "parents" | "coaches";

export interface Room {
  roomId: string;
  tenantId: string;
  teamId: string;
  type: RoomType;
  createdAt: number;
}

export interface Message {
  msgId: string;
  userId: string;
  text: string;
  ts: number;
}

const ROOM_KEY = (tenant: string, roomId: string) => `chat/room/${tenant}/${roomId}`;
const ROOM_PREFIX = (tenant: string) => `chat/room/${tenant}/`;
const MSG_PREFIX = (tenant: string, roomId: string) => `chat/msg/${tenant}/${roomId}/`;

export async function createRoom(
  env: Env,
  args: {
    tenant: string;
    roomId: string;
    teamId: string;
    type: RoomType;
  }
) {
  assert(args.tenant && args.roomId && args.teamId && args.type, "missing params");
  const key = ROOM_KEY(args.tenant, args.roomId);
  const exists = await kvGetJSON<Room>(env.KV_IDEMP, key);
  if (exists) return exists;
  const room: Room = {
    roomId: args.roomId,
    tenantId: args.tenant,
    teamId: args.teamId,
    type: args.type,
    createdAt: Date.now(),
  };
  await kvPutJSON(env.KV_IDEMP, key, room);
  return room;
}

export async function listRooms(env: Env, tenant: string, teamId?: string) {
  const rooms = await kvListJSON<Room>(env.KV_IDEMP, ROOM_PREFIX(tenant));
  return teamId ? rooms.filter((r) => r.teamId === teamId) : rooms;
}

// NOTE: authorize in the route layer (parent can write to parents room for their team, etc.)
export async function addMessage(
  env: Env,
  args: {
    tenant: string;
    roomId: string;
    userId: string;
    text: string;
  }
) {
  assert(args.text && args.text.trim(), "empty text");
  const msg: Message = { msgId: id(), userId: args.userId, text: args.text.trim(), ts: Date.now() };
  const key = `${MSG_PREFIX(args.tenant, args.roomId)}${msg.msgId}`;
  await env.KV_IDEMP.put(key, JSON.stringify(msg));
  return msg;
}

export async function listMessages(
  env: Env,
  args: {
    tenant: string;
    roomId: string;
    limit?: number;
  }
) {
  const prefix = MSG_PREFIX(args.tenant, args.roomId);
  const entries = await env.KV_IDEMP.list({ prefix, limit: Math.min(200, args.limit ?? 50) });
  // KV returns newest-last if we stored as individual keys; here we just return ascending by ts
  const msgs = await Promise.all(entries.keys.map((k) => env.KV_IDEMP.get(k.name, "json") as Promise<Message>));
  return msgs.filter(Boolean).sort((a, b) => a.ts - b.ts);
}
