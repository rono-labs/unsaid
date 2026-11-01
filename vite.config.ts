/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyRuntimeAssets } from "./scripts/copy-assets.mjs";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), { name: "runtime-assets", config: () => copyRuntimeAssets() }],
  worker: { format: "es" },
  test: {
    include: ["src/**/*.test.ts", "bench/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
