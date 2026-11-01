import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = "onnx-community/distilbert-NER-ONNX";
const files = ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "onnx/model_quantized.onnx"];
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models", repo);

for (const f of files) {
  const res = await fetch(`https://huggingface.co/${repo}/resolve/main/${f}`);
  if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
  const dest = join(root, f);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`saved ${f}`);
}
