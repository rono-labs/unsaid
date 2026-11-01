import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const copies = [
  ["onnxruntime-web/dist", "ort", (f) => /^ort-wasm-simd-threaded\.asyncify\.(wasm|mjs)$/.test(f)],
  ["tesseract.js/dist", "tesseract", (f) => f === "worker.min.js"],
  ["tesseract.js-core", "tesseract-core", (f) => /^tesseract-core.*-lstm\.wasm\.js$/.test(f)],
];

export function copyRuntimeAssets() {
  const out = join(root, "public", "vendor");
  const nm = join(root, "node_modules");
  for (const [src, dest, keep] of copies) {
    mkdirSync(join(out, dest), { recursive: true });
    for (const f of readdirSync(join(nm, src)).filter(keep)) cpSync(join(nm, src, f), join(out, dest, f));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  copyRuntimeAssets();
  console.log("copied runtime assets to public/vendor");
}
