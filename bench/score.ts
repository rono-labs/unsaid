import { TYPES } from "../src/core/rules";
import type { Finding } from "../src/core/types";

export interface Case {
  id: string;
  kind: string;
  text: string;
  labels: { value: string; type: string }[];
}

interface Span {
  start: number;
  end: number;
  type: string;
}

export interface Score {
  tp: number;
  fn: number;
  fp: number;
  precision: number;
  recall: number;
  f1: number;
  perType: Record<string, { tp: number; fn: number }>;
  misses: { id: string; value: string; type: string }[];
  falsePositives: { id: string; value: string; type: string }[];
}

function labelSpans(c: Case): Span[] {
  const spans: Span[] = [];
  for (const l of c.labels) {
    let i = c.text.indexOf(l.value);
    while (i !== -1) {
      spans.push({ start: i, end: i + l.value.length, type: l.type });
      i = c.text.indexOf(l.value, i + 1);
    }
  }
  return spans;
}

function covered(label: Span, findings: Finding[]): boolean {
  let hit = 0;
  for (const f of findings) {
    const lo = Math.max(label.start, f.start);
    const hi = Math.min(label.end, f.end);
    if (hi > lo) hit += hi - lo;
  }
  return hit >= 0.8 * (label.end - label.start);
}

export function score(
  cases: Case[],
  detectFn: (text: string) => Finding[],
  include: (type: string) => boolean = () => true,
): Score {
  const s: Score = { tp: 0, fn: 0, fp: 0, precision: 0, recall: 0, f1: 0, perType: {}, misses: [], falsePositives: [] };
  for (const c of cases) {
    const labels = labelSpans(c).filter((l) => include(l.type));
    const findings = detectFn(c.text).filter((f) => include(f.type));
    for (const l of labels) {
      const t = (s.perType[l.type] ??= { tp: 0, fn: 0 });
      if (covered(l, findings)) {
        s.tp++;
        t.tp++;
      } else {
        s.fn++;
        t.fn++;
        s.misses.push({ id: c.id, value: c.text.slice(l.start, l.end), type: l.type });
      }
    }
    const all = labelSpans(c);
    for (const f of findings) {
      if (!all.some((l) => f.start < l.end && l.start < f.end)) {
        s.fp++;
        s.falsePositives.push({ id: c.id, value: f.value, type: f.type });
      }
    }
  }
  s.precision = s.tp + s.fp ? s.tp / (s.tp + s.fp) : 0;
  s.recall = s.tp + s.fn ? s.tp / (s.tp + s.fn) : 0;
  s.f1 = s.precision + s.recall ? (2 * s.precision * s.recall) / (s.precision + s.recall) : 0;
  return s;
}

export const isRuleType = (t: string) => TYPES[t]?.category !== "name";
