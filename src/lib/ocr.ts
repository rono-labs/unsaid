import { createWorker, type Worker as TessWorker } from "tesseract.js";
import type { Finding } from "../core/types";

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  start: number;
  end: number;
  box: Box;
}

export interface OcrResult {
  text: string;
  words: OcrWord[];
}

let worker: Promise<TessWorker> | null = null;

function getWorker(onProgress?: (p: number) => void) {
  const base = new URL(import.meta.env.BASE_URL, location.origin).href;
  worker ??= createWorker("eng", 1, {
    workerPath: `${base}vendor/tesseract/worker.min.js`,
    corePath: `${base}vendor/tesseract-core/`,
    langPath: `${base}tessdata`,
    logger: (m) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  return worker;
}

interface TessWord {
  text: string;
  bbox: Box;
}
interface TessLine {
  words: TessWord[];
}

export async function recognize(image: Blob, onProgress?: (p: number) => void): Promise<OcrResult> {
  const w = await getWorker(onProgress);
  const { data } = await w.recognize(image, {}, { blocks: true });
  const lines: TessLine[] = [];
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs) for (const line of para.lines) lines.push(line as unknown as TessLine);
  return layout(lines);
}

export function layout(lines: TessLine[]): OcrResult {
  let text = "";
  const words: OcrWord[] = [];
  for (const line of lines) {
    const ws = line.words.filter((w) => w.text.trim());
    ws.forEach((w, i) => {
      if (i > 0) text += " ";
      words.push({ text: w.text, start: text.length, end: text.length + w.text.length, box: w.bbox });
      text += w.text;
    });
    text += "\n";
  }
  return { text, words };
}

export function boxesFor(findings: Finding[], words: OcrWord[]): { finding: Finding; box: Box }[] {
  const out: { finding: Finding; box: Box }[] = [];
  for (const f of findings) {
    const hit = words.filter((w) => w.start < f.end && f.start < w.end);
    const rows = new Map<number, OcrWord[]>();
    for (const w of hit) {
      const key = Math.round(w.box.y0 / 4);
      const row = [...rows.keys()].find((k) => Math.abs(k - key) <= 2) ?? key;
      rows.set(row, [...(rows.get(row) ?? []), w]);
    }
    for (const row of rows.values()) {
      const box = row.reduce<Box>(
        (b, w) => {
          const len = w.end - w.start;
          const frac0 = len ? Math.max(0, f.start - w.start) / len : 0;
          const frac1 = len ? Math.min(len, f.end - w.start) / len : 1;
          const width = w.box.x1 - w.box.x0;
          const x0 = w.box.x0 + width * frac0;
          const x1 = w.box.x0 + width * frac1;
          return { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, w.box.y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, w.box.y1) };
        },
        { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
      );
      out.push({ finding: f, box });
    }
  }
  return out;
}
