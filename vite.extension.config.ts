import { cpSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";
import { defineConfig } from "vite";

const outDir = "dist-extension";

export default defineConfig({
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    lib: { entry: "src/extension/content.ts", formats: ["iife"], name: "unsaid", fileName: () => "content.js" },
  },
  plugins: [
    {
      name: "extension-package",
      closeBundle() {
        cpSync("extension", outDir, { recursive: true });
        const files = Object.fromEntries(readdirSync(outDir).map((f) => [f, readFileSync(join(outDir, f))]));
        writeFileSync("public/unsaid-extension.zip", zipSync(files, { level: 9, mtime: new Date("2026-11-01") }));
      },
    },
  ],
});
