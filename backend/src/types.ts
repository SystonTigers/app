export type Channel = "yt" | "fb" | "ig" | "tiktok" | "x";

export type PostJob = {
  tenant: string;
  template: string;
  channels: Channel[];
  data: Record<string, unknown>;
  createdAt: number;
  idemKey: string;
};

export type TenantId = string;

export interface TenantFlags {
  use_make?: boolean;    // legacy global switch (kept)
  direct_yt?: boolean;   // legacy
  // new per-channel switches (optional, default false)
  managed?: Partial<Record<Channel, boolean>>; // e.g. { ig:true, x:false }
}

export interface TenantCredentials {
  // YouTube
  yt?: {
    // Managed tokens (issued by our project OR their BYO project)
    refresh_token?: string;
    access_token?: string;
    access_token_expires_at?: number;
    // BYO-Google (tenant-provided OAuth app)
    client_id?: string;
    client_secret?: string;
    // channel id (optional cache)
    channel_id?: string;
  };
  // Meta (FB/IG)
  fb?: { page_access_token?: string; page_id?: string; };
  ig?: { ig_user_id?: string; access_token?: string; }; // IG Business via Graph
  // TikTok
  tiktok?: { refresh_token?: string; open_id?: string; };
  // X (Twitter)
  x?: {
    bearer_token?: string;
    access_token?: string;
    access_secret?: string;
    client_id?: string;
    client_secret?: string;
  };
  // BYO-Make per channel
  make?: Partial<Record<Channel, string>>; // channel→webhook URL
}

export interface TenantConfig {
  id: TenantId;
  name?: string;
  locale?: string; // e.g. "en-GB"
  tz?: string;     // e.g. "Europe/London"
  flags: TenantFlags;
  creds?: TenantCredentials;
  // Legacy - kept for backward compatibility
  makeWebhookUrl?: string | null;
  created_at?: number;
  updated_at?: number;
  // Tenant metadata
  metadata?: {
    contactEmail?: string;
    contactName?: string;
    plan?: string;
    createdAt?: string;
    provisionedBy?: string;
  };
}

// Fallback response for manual upload
export interface FallbackResponse {
  fallback: "share" | "upload_stream";
  reason: string;
  suggested: string[];
  channel: Channel;
}

// Env interface for Workers
export interface Env {
  KV_IDEMP: KVNamespace;
  POST_QUEUE: Queue;
  DLQ: Queue;
  DLQ_ALERT_URL?: string;
  RL_POSTS_PER_MIN?: string;
  RL_UPLOADS_PER_MIN?: string;
  R2_MEDIA: R2Bucket;
  TenantRateLimiter: DurableObjectNamespace;
  VotingRoom: DurableObjectNamespace;
  ChatRoom: DurableObjectNamespace;
  MatchRoom: DurableObjectNamespace;
  JWT_SECRET: string;
  ADMIN_JWT: string;
  YT_CLIENT_ID?: string;
  YT_CLIENT_SECRET?: string;
  YT_SHARDS_JSON?: string;
  YT_REDIRECT_URL: string;
  FCM_SERVER_KEY?: string;
  FIXTURES_REFRESH_URL?: string;
  SETUP_URL: string;
  GALLERY_MAX_BYTES?: string;
  GALLERY_ALLOWED?: string;
  API_VERSION: string;
  CORS_ALLOWED?: string;
  // Apps Script automation
  GOOGLE_SERVICE_ACCOUNT_KEY?: string;
  APPS_SCRIPT_TEMPLATE_ID?: string;
  APPS_SCRIPT_AUTO_DEPLOY?: string;
  BACKEND_URL?: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  ADMIN_CONSOLE_URL?: string;
  [key: string]: any;
}
