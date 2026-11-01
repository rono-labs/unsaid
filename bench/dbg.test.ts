import { readFileSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { runRules } from "../src/core/detect";

test("dbg", () => {
  const cs = JSON.parse(readFileSync(new URL("./corpus/cases.json", import.meta.url).pathname, "utf8"));
  const ids = (process.env.IDS ?? "").split(",");
  const out: string[] = [];
  for (const c of cs.filter((x: { id: string }) => ids.includes(x.id)))
    for (const f of runRules(c.text))
      out.push([c.id, f.type, f.score, f.value.slice(0, 40), f.value.length, JSON.stringify(c.text.slice(Math.max(0, f.start - 50), f.start))].join(" | "));
  writeFileSync(process.env.DBG_OUT!, out.join("\n"));
});
