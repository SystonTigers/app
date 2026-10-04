export interface Env {
  KV: KVNamespace;
  KV_IDEMP: KVNamespace;
  R2: R2Bucket;
  R2_MEDIA: R2Bucket;
  DB: D1Database;

  DLQ: Queue;

  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GITHUB_TOKEN: string;
  EXPO_ACCESS_TOKEN?: string;
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID: string;

  ALLOW_PUBLIC_APIS?: string;
  RESVG_WASM?: WebAssembly.Module;
}
