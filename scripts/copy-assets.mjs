import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vendor");
const nm = join(root, "node_modules");

const copies = [
  ["onnxruntime-web/dist", "ort", (f) => /^ort-wasm.*\.(wasm|mjs)$/.test(f)],
  ["tesseract.js/dist", "tesseract", (f) => f === "worker.min.js"],
  ["tesseract.js-core", "tesseract-core", (f) => /^tesseract-core.*\.(js|wasm)$/.test(f)],
];

for (const [src, dest, keep] of copies) {
  mkdirSync(join(out, dest), { recursive: true });
  for (const f of readdirSync(join(nm, src)).filter(keep)) cpSync(join(nm, src, f), join(out, dest, f));
}
console.log("copied runtime assets to public/vendor");
