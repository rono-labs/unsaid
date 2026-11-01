import type { Finding } from "./types";

export interface TokenOut {
  entity: string;
  score: number;
  word: string;
  start?: number | null;
  end?: number | null;
}

const TYPE: Record<string, string> = { PER: "PERSON", ORG: "ORG", LOC: "LOCATION" };

export function chunkText(text: string, max = 900): { offset: number; text: string }[] {
  const chunks: { offset: number; text: string }[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + max);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      const sp = text.lastIndexOf(" ", end);
      const cut = nl > start + max / 2 ? nl : sp > start + max / 2 ? sp : end;
      end = cut;
    }
    chunks.push({ offset: start, text: text.slice(start, end) });
    start = end;
  }
  return chunks.filter((c) => c.text.trim().length > 0);
}

export function tokensToFindings(text: string, offset: number, tokens: TokenOut[], minMean = 0.6, minPeak = 0.85): Finding[] {
  const out: Finding[] = [];
  let cursor = 0;
  let cur: { type: string; start: number; end: number; scores: number[] } | null = null;

  const flush = () => {
    if (!cur) return;
    const value = text.slice(cur.start, cur.end);
    const mean = cur.scores.reduce((a, b) => a + b, 0) / cur.scores.length;
    if (mean >= minMean && Math.max(...cur.scores) >= minPeak && keepEntity(value, cur.type)) {
      out.push({
        start: offset + cur.start,
        end: offset + cur.end,
        value,
        type: cur.type,
        category: "name",
        source: "model",
        score: 0.5 + 0.3 * mean,
      });
    }
    cur = null;
  };

  for (const t of tokens) {
    const [tag, kind] = t.entity.includes("-") ? t.entity.split("-") : ["I", t.entity];
    const type = TYPE[kind];
    const piece = t.word.replace(/^##/, "");
    let start = t.start ?? -1;
    let end = t.end ?? -1;
    if (start < 0 || end < 0) {
      start = text.indexOf(piece, cursor);
      if (start < 0) continue;
      end = start + piece.length;
    }
    cursor = end;
    if (!type) {
      flush();
      continue;
    }
    const subword = t.word.startsWith("##");
    const contiguous = cur && /^[ \t.'-]*$/.test(text.slice(cur.end, start));
    if (cur && contiguous && (subword || (tag === "I" && (cur.type === type || /^\s?$/.test(text.slice(cur.end, start)))))) {
      cur.end = end;
      cur.scores.push(t.score);
    } else {
      flush();
      cur = { type, start, end, scores: [t.score] };
    }
  }
  flush();
  return out;
}

const STOP = new Set(["AWS", "API", "GET", "POST", "JSON", "SQL", "HTTP", "URL", "CLI", "SDK", "UTC", "ID", "OK"]);

function keepEntity(value: string, type: string): boolean {
  const v = value.trim();
  if (v.length < 3 || STOP.has(v)) return false;
  if (/[=:{}()<>[\]/\\_@$]/.test(v)) return false;
  if (!/^[A-ZÀ-ɏ]/.test(v)) return false;
  if (type === "PERSON" && /^[A-Z]{2,}$/.test(v)) return false;
  return true;
}
