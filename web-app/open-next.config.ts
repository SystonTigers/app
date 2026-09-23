import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default setup: no incremental cache. Every page here is dynamic (per-club
// data fetched at request time), so there is nothing to cache between deploys.
export default defineCloudflareConfig();
