/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  worker: { format: "es" },
  test: {
    include: ["src/**/*.test.ts", "bench/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
