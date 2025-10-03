// backend/src/do/votingRoom.ts
import type { Env } from "../types";

type VoteSettings = {
  tenant: string;
  matchId: string;
  open: boolean;
  candidates: { id: string; name: string }[];
  maxVotesPerUser: number; // default 1
};

type Snapshot = {
  settings: VoteSettings;
  counts: Record<string, number>;
  voted: Record<string, true>; // userHash->true
  updatedAt: number;
};

export class VotingRoom {
  state: DurableObjectState;
  env: Env;
  snapshot: Snapshot | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  // ---- helpers ----
  private keySnap(tenant: string, matchId: string) {
    return `tenants:${tenant}:motm:${matchId}:snapshot`;
  }
  private ensure() {
    if (!this.snapshot) throw new Error("room not initialised");
  }

  // Load from storage (DO storage) or KV snapshot
  private async load(tenant: string, matchId: string) {
    const local = await this.state.storage.get<Snapshot>("snapshot");
    if (local) { this.snapshot = local; return; }
    const snapKV = await this.env.KV_IDEMP.get(this.keySnap(tenant, matchId), "json") as Snapshot | null;
    if (snapKV) {
      await this.state.storage.put("snapshot", snapKV);
      this.snapshot = snapKV;
    }
  }

  private async save() {
    this.ensure();
    this.snapshot!.updatedAt = Date.now();
    await this.state.storage.put("snapshot", this.snapshot);
  }

  private async flushToKV() {
    this.ensure();
    const { tenant, matchId } = this.snapshot!.settings;
    await this.env.KV_IDEMP.put(this.keySnap(tenant, matchId), JSON.stringify(this.snapshot));
  }

  // ---- API ----
  async open(settings: Omit<VoteSettings, "open"> & { open?: boolean }) {
    await this.load(settings.tenant, settings.matchId);
    const openSettings: VoteSettings = {
      tenant: settings.tenant,
      matchId: settings.matchId,
      open: true,
      candidates: settings.candidates ?? [],
      maxVotesPerUser: settings.maxVotesPerUser ?? 1,
    };
    this.snapshot = {
      settings: openSettings,
      counts: Object.fromEntries((openSettings.candidates || []).map(c => [c.id, 0])),
      voted: {},
      updatedAt: Date.now(),
    };
    await this.save();
    await this.flushToKV();
    return { ok: true };
  }

  async vote(candidateId: string, userHash: string) {
    this.ensure();
    if (!this.snapshot!.settings.open) throw new Error("voting closed");
    if (this.snapshot!.voted[userHash]) throw new Error("already voted");

    if (!(candidateId in this.snapshot!.counts)) throw new Error("invalid candidate");

    // enforce simple per-user limit (1)
    const limit = this.snapshot!.settings.maxVotesPerUser || 1;
    // NOTE: For >1, track a counter per userHash; for now single vote
    if (limit !== 1) {
      // TODO: expand to counter if you later want >1 votes/user
    }

    this.snapshot!.counts[candidateId] += 1;
    this.snapshot!.voted[userHash] = true;

    await this.save();
    // Light flush (don't spam KV): write-through every 5s
    await this.state.storage.put("lastWrite", Date.now());
    const lastWrite = (await this.state.storage.get<number>("lastKVFlush")) || 0;
    if (Date.now() - lastWrite > 5000) {
      await this.flushToKV();
      await this.state.storage.put("lastKVFlush", Date.now());
    }
    return { ok: true };
  }

  async tally() {
    this.ensure();
    return {
      open: this.snapshot!.settings.open,
      candidates: this.snapshot!.settings.candidates,
      counts: this.snapshot!.counts,
      updatedAt: this.snapshot!.updatedAt,
    };
  }

  async close() {
    this.ensure();
    this.snapshot!.settings.open = false;
    await this.save();
    await this.flushToKV();
    return { ok: true };
  }

  // Durable Object stub handler (if you want to call .fetch() directly)
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname.endsWith("/open")) {
      const s = await req.json() as any;
      return Response.json(await this.open(s));
    }
    if (req.method === "POST" && url.pathname.endsWith("/vote")) {
      const { candidateId, userHash } = await req.json() as any;
      return Response.json(await this.vote(candidateId, userHash));
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
