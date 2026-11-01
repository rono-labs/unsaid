import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { expect, test } from "vitest";
import { detect } from "../src/core/detect";
import { isRuleType, score, type Case } from "./score";

const load = (name: string): Case[] =>
  JSON.parse(gunzipSync(readFileSync(new URL(`./${name}/cases.json.gz`, import.meta.url))).toString("utf8"));

test.each(["corpus", "test"])("rule detectors on %s", (name) => {
  const cases = load(name);
  const s = score(cases, (t) => detect(t), isRuleType);
  if (process.env.BENCH_OUT) writeFileSync(`${process.env.BENCH_OUT}-${name}.json`, JSON.stringify(s, null, 2));
  expect(s.recall).toBeGreaterThan(0.9);
  expect(s.precision).toBeGreaterThan(0.9);
});
