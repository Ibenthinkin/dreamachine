import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // The engine only starts on a user gesture, but keep headless audio
          // permissive so AudioContext runs without a real output device.
          args: ["--autoplay-policy=no-user-gesture-required"],
        },
      },
    },
  ],
  webServer: {
    command: "bun e2e/static-server.ts",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
