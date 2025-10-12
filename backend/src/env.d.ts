export interface Env {
  KV: KVNamespace;
  KV_IDEMP: KVNamespace;
  R2: R2Bucket;
  R2_MEDIA: R2Bucket;
  DB: D1Database;

  POST_QUEUE: Queue;
  DLQ: Queue;

  TenantRateLimiter: DurableObjectNamespace;
  VotingRoom: DurableObjectNamespace;
  ChatRoom: DurableObjectNamespace;
  MatchRoom: DurableObjectNamespace;
  GeoFenceManager: DurableObjectNamespace;

  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GITHUB_TOKEN: string;
  EXPO_ACCESS_TOKEN?: string;

  ALLOW_PUBLIC_APIS?: string;
  RESVG_WASM?: WebAssembly.Module;
}
