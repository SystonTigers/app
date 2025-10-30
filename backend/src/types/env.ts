export interface Env {
  WORKER_BASE_URL: string;
  ENVIRONMENT: "production" | "staging" | "dev";
  APP_VERSION: string;
  BACKEND_API_KEY: string;

  GAS_WEBAPP_URL: string;
  GAS_HMAC_SECRET: string;
  TEMPLATE_SPREADSHEET_ID: string;
  YOUTUBE_API_KEY: string;

  TENANTS: KVNamespace;
}
