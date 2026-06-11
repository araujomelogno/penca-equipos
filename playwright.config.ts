import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3040",
    headless: true,
    browserName: "chromium",
  },
  projects: [
    {
      name: "readonly",
      testIgnore: /image-upload/,
    },
    {
      name: "mutating",
      testMatch: /image-upload/,
    },
  ],
});
