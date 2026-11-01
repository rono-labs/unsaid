import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { env, pipeline, type TokenClassificationPipeline } from "@huggingface/transformers";
import { test } from "vitest";
import { detect } from "../src/core/detect";
import { chunkText, tokensToFindings, type TokenOut } from "../src/core/ner";
import type { Finding } from "../src/core/types";
import { score, type Case } from "./score";

const MODEL = "onnx-community/distilbert-NER-ONNX";
const models = fileURLToPath(new URL("../public/models/", import.meta.url));
const hasModel = existsSync(`${models}${MODEL}/config.json`);

test.skipIf(!hasModel)("rules + on-device NER on both corpora", async () => {
  env.localModelPath = models;
  env.allowRemoteModels = false;
  const ner = (await pipeline("token-classification", MODEL, { dtype: "q8" })) as TokenClassificationPipeline;
  const results: Record<string, unknown> = {};
  for (const name of ["corpus", "test"]) {
    const cases: Case[] = JSON.parse(readFileSync(new URL(`./${name}/cases.json`, import.meta.url), "utf8"));
    const extra = new Map<string, Finding[]>();
    for (const c of cases) {
      const found: Finding[] = [];
      for (const chunk of chunkText(c.text)) {
        const tokens = (await ner(chunk.text, { ignore_labels: [] })) as unknown as TokenOut[];
        found.push(...tokensToFindings(chunk.text, chunk.offset, tokens));
      }
      extra.set(c.text, found);
    }
    const s = score(cases, (t) => detect(t, { extra: extra.get(t) }));
    results[name] = s;
  }
  if (process.env.BENCH_OUT) writeFileSync(process.env.BENCH_OUT, JSON.stringify(results, null, 2));
});
