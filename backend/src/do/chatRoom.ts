// backend/src/do/chatRoom.ts
import type { Env } from "../types";
import { sanitizers } from "../lib/sanitize";

type ChatMessage = {
  id: string;
  ts: number;
  userId: string;
  text: string;
  media?: string[];
};

type ChatState = {
  tenant: string;
  roomId: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export class ChatRoom {
  state: DurableObjectState;
  env: Env;
  chatState: ChatState | null = null;
  typingUsers: Map<string, number> = new Map(); // userId -> expiryTs

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private keySnap(tenant: string, roomId: string) {
    return `tenants:${tenant}:chat:${roomId}:last`;
  }

  private keyIndex(tenant: string) {
    return `tenants:${tenant}:chat:index`;
  }

  private async load(tenant: string, roomId: string) {
    const local = await this.state.storage.get<ChatState>("state");
    if (local) {
      this.chatState = local;
      return;
    }
    const snapKV = (await this.env.KV_IDEMP.get(this.keySnap(tenant, roomId), "json")) as ChatState | null;
    if (snapKV) {
      await this.state.storage.put("state", snapKV);
      this.chatState = snapKV;
    } else {
      // Initialize new room
      this.chatState = {
        tenant,
        roomId,
        messages: [],
        updatedAt: Date.now(),
      };
      await this.state.storage.put("state", this.chatState);
    }
  }

  private async save() {
    if (!this.chatState) throw new Error("chat not initialized");
    this.chatState.updatedAt = Date.now();
    await this.state.storage.put("state", this.chatState);
  }

  private async flushToKV() {
    if (!this.chatState) return;
    const { tenant, roomId } = this.chatState;
    // Keep last 200 messages in KV
    const snapshot = {
      ...this.chatState,
      messages: this.chatState.messages.slice(-200),
    };
    await this.env.KV_IDEMP.put(this.keySnap(tenant, roomId), JSON.stringify(snapshot));

    // Update rooms index
    const indexKey = this.keyIndex(tenant);
    const existing = ((await this.env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
    const row = { roomId, lastTs: this.chatState.updatedAt };
    const next = [row, ...existing.filter((r) => r.roomId !== roomId)];
    await this.env.KV_IDEMP.put(indexKey, JSON.stringify(next.slice(0, 1000)));
  }

  async send(data: { tenant: string; roomId: string; userId: string; text: string; mediaIds?: string[] }) {
    await this.load(data.tenant, data.roomId);
    if (!this.chatState) throw new Error("chat not initialized");

    // SECURITY: Sanitize HTML to prevent XSS attacks
    let sanitized = sanitizers.comment(data.text);

    // Simple bad-words filter (optional)
    const badWords = ["badword1", "badword2"]; // extend as needed
    for (const word of badWords) {
      sanitized = sanitized.replace(new RegExp(word, "gi"), "***");
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ts = Date.now();
    const msg: ChatMessage = {
      id,
      ts,
      userId: data.userId,
      text: sanitized,
      media: data.mediaIds,
    };

    this.chatState.messages.push(msg);
    // Keep last 500 in memory
    if (this.chatState.messages.length > 500) {
      this.chatState.messages = this.chatState.messages.slice(-500);
    }

    await this.save();

    // Flush to KV every 5s
    const lastKVFlush = (await this.state.storage.get<number>("lastKVFlush")) || 0;
    if (ts - lastKVFlush > 5000) {
      await this.flushToKV();
      await this.state.storage.put("lastKVFlush", ts);
    }

    return { ok: true, messageId: id };
  }

  async history(data: { tenant: string; roomId: string; cursor?: string; limit?: number }) {
    await this.load(data.tenant, data.roomId);
    if (!this.chatState) throw new Error("chat not initialized");

    const limit = data.limit || 50;
    let messages = [...this.chatState.messages];

    // Simple cursor: timestamp-based
    if (data.cursor) {
      const cursorTs = parseInt(data.cursor, 10);
      messages = messages.filter((m) => m.ts < cursorTs);
    }

    // Return newest first
    messages.sort((a, b) => b.ts - a.ts);
    const page = messages.slice(0, limit);
    const nextCursor = page.length > 0 ? String(page[page.length - 1].ts) : null;

    return {
      ok: true,
      data: {
        messages: page,
        nextCursor,
      },
    };
  }

  async typing(data: { tenant: string; roomId: string; userId: string; typing: boolean }) {
    await this.load(data.tenant, data.roomId);
    if (!this.chatState) throw new Error("chat not initialized");

    const now = Date.now();
    if (data.typing) {
      this.typingUsers.set(data.userId, now + 10000); // 10s TTL
    } else {
      this.typingUsers.delete(data.userId);
    }

    // Clean expired
    for (const [userId, expiryTs] of this.typingUsers.entries()) {
      if (now > expiryTs) this.typingUsers.delete(userId);
    }

    return { ok: true, typing: Array.from(this.typingUsers.keys()) };
  }

  async fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname.endsWith("/send")) {
      const body = (await req.json()) as any;
      return Response.json(await this.send(body));
    }
    if (req.method === "GET" && url.pathname.endsWith("/history")) {
      const tenant = url.searchParams.get("tenant") || "";
      const roomId = url.searchParams.get("roomId") || "";
      const cursor = url.searchParams.get("cursor") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      return Response.json(await this.history({ tenant, roomId, cursor, limit }));
    }
    if (req.method === "POST" && url.pathname.endsWith("/typing")) {
      const body = (await req.json()) as any;
      return Response.json(await this.typing(body));
    }
    return new Response("Not found", { status: 404 });
  }
}
