import { env, pipeline, type TokenClassificationPipeline } from "@huggingface/transformers";
import { chunkText, tokensToFindings, type TokenOut } from "../core/ner";

export const MODEL_ID = "onnx-community/distilbert-NER-ONNX";

const base = new URL(import.meta.env.BASE_URL, self.location.origin).href;
env.allowLocalModels = true;
env.localModelPath = `${base}models/`;
env.allowRemoteModels = true;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = `${base}vendor/ort/`;

let ready: Promise<TokenClassificationPipeline> | null = null;

function load() {
  ready ??= pipeline("token-classification", MODEL_ID, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      if (p.status === "progress" && p.file?.endsWith(".onnx")) postMessage({ kind: "progress", progress: p.progress ?? 0 });
    },
  }) as Promise<TokenClassificationPipeline>;
  return ready;
}

self.onmessage = async (e: MessageEvent<{ id: number; kind: "load" | "run"; text?: string }>) => {
  const { id, kind, text = "" } = e.data;
  try {
    const ner = await load();
    if (kind === "load") {
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
