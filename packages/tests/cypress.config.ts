import { defineConfig } from "cypress";

const baseUrl = process.env.CYPRESS_BASE_URL || "http://localhost:8080";
const apiBaseUrl = process.env.CYPRESS_API_BASE_URL || "http://localhost:9000";

export default defineConfig({
  video: false,
  retries: { runMode: 1, openMode: 0 },
  e2e: {
    baseUrl,
    specPattern: "cypress/**/*.{cy,spec}.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    env: {
      apiBaseUrl,
      storeApiBaseUrl: process.env.CYPRESS_STORE_API_BASE_URL || apiBaseUrl,
      adminApiBaseUrl: process.env.CYPRESS_ADMIN_API_BASE_URL || apiBaseUrl,
      adminBaseUrl: process.env.CYPRESS_ADMIN_BASE_URL || "",
      adminEmail: process.env.CYPRESS_ADMIN_EMAIL || "",
      adminPassword: process.env.CYPRESS_ADMIN_PASSWORD || "",
      runApi: process.env.CYPRESS_RUN_API || "false",
      runE2e: process.env.CYPRESS_RUN_E2E || "false"
    }
  }
});
