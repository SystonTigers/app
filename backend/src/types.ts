export type PostJob = {
  tenant: string;
  template: string;
  channels: string[];
  data: Record<string, unknown>;
  createdAt: number;
  idemKey: string;
};

export type TenantId = string;

export type TenantFlags = {
  use_make: boolean;
  direct_yt: boolean;
};

export type TenantConfig = {
  id: TenantId;
  name?: string;
  locale?: string; // e.g. "en-GB"
  tz?: string;     // e.g. "Europe/London"
  flags: TenantFlags;
  makeWebhookUrl?: string | null;
};
