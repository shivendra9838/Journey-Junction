import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  webServer: {
    command: "pnpm --filter @workspace/wandr run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      PORT: "5173",
      BASE_PATH: "/",
    },
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", use: { ...devices["Pixel 5"], channel: "chrome" } },
  ],
});
