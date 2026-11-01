import { env, pipeline, type TokenClassificationPipeline } from "@huggingface/transformers";
import { chunkText, tokensToFindings, type TokenOut } from "../core/ner";

export const MODEL_ID = "onnx-community/distilbert-NER-ONNX";

const base = import.meta.env.BASE_URL;
env.localModelPath = `${base}models/`;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = new URL(`${base}vendor/ort/`, self.location.origin).href;

let lastProgress = -1;

let ready: Promise<TokenClassificationPipeline> | null = null;

async function hasLocalModel(): Promise<boolean> {
  try {
    const res = await fetch(`${env.localModelPath}${MODEL_ID}/config.json`, { method: "HEAD" });
    return res.ok && !(res.headers.get("content-type") ?? "").includes("text/html");
  } catch {
    return false;
  }
}

async function create() {
  const local = await hasLocalModel();
  env.allowLocalModels = local;
  env.allowRemoteModels = !local;
  if (local) {
    // Private windows keep the HTTP cache in memory and abort the 66 MB model download when it doesn't fit,
    // so same-origin model files skip the HTTP cache and keep the Cache Storage copy.
    env.fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
  }
  return pipeline("token-classification", MODEL_ID, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      if (p.status !== "progress" || !p.file?.endsWith(".onnx")) return;
      const pct = Math.floor(p.progress ?? 0);
      if (pct !== lastProgress) {
        lastProgress = pct;
        postMessage({ kind: "progress", progress: pct });
      }
    },
  }) as Promise<TokenClassificationPipeline>;
}

function load() {
  ready ??= create();
  return ready;
}

self.onmessage = async (e: MessageEvent<{ id: number; kind: "load" | "run"; text?: string }>) => {
  const { id, kind, text = "" } = e.data;
  try {
    const ner = await load();
    if (kind === "load") {
      const hosts = performance.getEntriesByType("resource").map((e) => new URL(e.name).host);
      postMessage({ kind: "hosts", hosts: [...new Set(hosts)].filter((h) => h && h !== self.location.host) });
      postMessage({ id, kind: "ready" });
      return;
    }
    const findings = [];
    for (const chunk of chunkText(text)) {
      const tokens = (await ner(chunk.text, { ignore_labels: [] })) as unknown as TokenOut[];
      findings.push(...tokensToFindings(chunk.text, chunk.offset, tokens));
    }
    postMessage({ id, kind: "result", findings });
  } catch (err) {
    postMessage({ id, kind: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
