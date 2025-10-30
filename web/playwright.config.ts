import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: process.env.WEB_BASE_URL || "http://localhost:3000",
  },
});
