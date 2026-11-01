import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { detect } from "../src/core/detect";
import { isRuleType, score, type Case } from "./score";

const file = process.env.BENCH_CORPUS ?? new URL("./corpus/cases.json", import.meta.url).pathname;
const cases: Case[] = JSON.parse(readFileSync(file, "utf8"));

test("rule detector on benchmark corpus", () => {
  const s = score(cases, (t) => detect(t), isRuleType);
  const out = process.env.BENCH_OUT;
  if (out) writeFileSync(out, JSON.stringify(s, null, 2));
  console.log(
    `cases=${cases.length} tp=${s.tp} fn=${s.fn} fp=${s.fp} precision=${s.precision.toFixed(3)} recall=${s.recall.toFixed(3)} f1=${s.f1.toFixed(3)}`,
  );
  expect(s.recall).toBeGreaterThan(0.9);
  expect(s.precision).toBeGreaterThan(0.9);
});
