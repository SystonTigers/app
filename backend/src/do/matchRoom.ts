// backend/src/do/matchRoom.ts
import type { Env } from "../types";
import { sendToUser } from "../services/push";

type MatchEvent = {
  id: string;
  ts: number;
  type: "goal" | "yellow" | "red" | "sub" | "ht" | "ft" | "note";
  minute?: number;
  payload?: any;
};

type MatchState = {
  tenant: string;
  matchId: string;
  title?: string;
  home?: string;
  away?: string;
  kickoffTs?: number;
  timeline: MatchEvent[];
  homeScore: number;
  awayScore: number;
  closed: boolean;
  updatedAt: number;
};

export class MatchRoom {
  state: DurableObjectState;
  env: Env;
  matchState: MatchState | null = null;
  lastPushTs: number = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private keySnap(tenant: string, matchId: string) {
    return `tenants:${tenant}:matches:${matchId}:live`;
  }

  private async load(tenant: string, matchId: string) {
    const local = await this.state.storage.get<MatchState>("state");
    if (local) {
      this.matchState = local;
      return;
    }
    const snapKV = (await this.env.KV_IDEMP.get(this.keySnap(tenant, matchId), "json")) as MatchState | null;
    if (snapKV) {
      await this.state.storage.put("state", snapKV);
      this.matchState = snapKV;
    }
  }

  private async save() {
    if (!this.matchState) throw new Error("match not initialized");
    this.matchState.updatedAt = Date.now();
    await this.state.storage.put("state", this.matchState);
  }

  private async flushToKV() {
    if (!this.matchState) return;
    const { tenant, matchId } = this.matchState;
    await this.env.KV_IDEMP.put(this.keySnap(tenant, matchId), JSON.stringify(this.matchState));
  }

  private async maybePush(eventType: string, text: string) {
    if (!this.matchState) return;
    const now = Date.now();
    // Goals: immediate; others: throttle to 1/15s
    if (eventType === "goal" || now - this.lastPushTs > 15000) {
      this.lastPushTs = now;
      // Stub: send to all tokens for this tenant (in real impl, filter by team/match subscription)
      try {
        const tokensKey = `tenants:${this.matchState.tenant}:push:tokens`;
        const tokens = ((await this.env.KV_IDEMP.get(tokensKey, "json")) as string[]) || [];
        if (tokens.length > 0) {
          // Use existing push service if available
          // For now, just log (sendToUser expects userId, we have tokens)
          console.log(`[MatchRoom] Would push to ${tokens.length} tokens: ${text}`);
        }
      } catch (e) {
        console.error("[MatchRoom] push error:", e);
      }
    }
  }

  async open(data: { tenant: string; matchId: string; title?: string; home?: string; away?: string; kickoffTs?: number }) {
    await this.load(data.tenant, data.matchId);
    this.matchState = {
      tenant: data.tenant,
      matchId: data.matchId,
      title: data.title,
      home: data.home,
      away: data.away,
      kickoffTs: data.kickoffTs,
      timeline: [],
      homeScore: 0,
      awayScore: 0,
      closed: false,
      updatedAt: Date.now(),
    };
    await this.save();
    await this.flushToKV();
    return { ok: true };
  }

  async event(evt: Omit<MatchEvent, "id" | "ts">) {
    if (!this.matchState) throw new Error("match not initialized");
    if (this.matchState.closed) throw new Error("match closed");

    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ts = Date.now();
    const fullEvent: MatchEvent = { id, ts, ...evt };

    // Update score if goal
    if (evt.type === "goal" && evt.payload?.side) {
      if (evt.payload.side === "home") this.matchState.homeScore++;
      else if (evt.payload.side === "away") this.matchState.awayScore++;
    }

    this.matchState.timeline.push(fullEvent);
    await this.save();

    // Light flush (every 5s)
    const lastKVFlush = (await this.state.storage.get<number>("lastKVFlush")) || 0;
    if (ts - lastKVFlush > 5000) {
      await this.flushToKV();
      await this.state.storage.put("lastKVFlush", ts);
    }

    // Push notification
    let pushText = `Match event: ${evt.type}`;
    if (evt.type === "goal" && evt.payload?.scorer) {
      pushText = `⚽ Goal! ${evt.payload.scorer} (${evt.minute}')`;
    }
    await this.maybePush(evt.type, pushText);

    return { ok: true, eventId: id };
  }

  async tally() {
    if (!this.matchState) throw new Error("match not initialized");
    return {
      ok: true,
      data: {
        matchId: this.matchState.matchId,
        title: this.matchState.title,
        home: this.matchState.home,
        away: this.matchState.away,
        homeScore: this.matchState.homeScore,
        awayScore: this.matchState.awayScore,
        timeline: this.matchState.timeline,
        closed: this.matchState.closed,
        updatedAt: this.matchState.updatedAt,
      },
    };
  }

  async close() {
    if (!this.matchState) throw new Error("match not initialized");
    this.matchState.closed = true;
    await this.save();
    await this.flushToKV();
    return { ok: true };
  }

  async fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname.endsWith("/open")) {
      const body = (await req.json()) as any;
      return Response.json(await this.open(body));
    }
    if (req.method === "POST" && url.pathname.endsWith("/event")) {
      const body = (await req.json()) as any;
      return Response.json(await this.event(body));
    }
    if (req.method === "GET" && url.pathname.endsWith("/tally")) {
      return Response.json(await this.tally());
    }
    if (req.method === "POST" && url.pathname.endsWith("/close")) {
      return Response.json(await this.close());
    }
    return new Response("Not found", { status: 404 });
  }
}
