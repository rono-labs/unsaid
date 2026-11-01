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

async function prepare(image: Blob): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  const bitmap = await createImageBitmap(image);
  const scale = bitmap.width < 1600 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = y;
    sum += y;
  }
  if (sum / (px.length / 4) < 128) for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
  ctx.putImageData(img, 0, 0);
  return { canvas, scale };
}

export async function recognize(image: Blob, onProgress?: (p: number) => void): Promise<OcrResult> {
  const w = await getWorker(onProgress);
  const { canvas, scale } = await prepare(image);
  const { data } = await w.recognize(canvas, {}, { blocks: true });
  const lines: TessLine[] = [];
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs)
      for (const line of para.lines as unknown as TessLine[])
        lines.push({
          words: line.words.map((wd) => ({
            text: wd.text,
            bbox: { x0: wd.bbox.x0 / scale, y0: wd.bbox.y0 / scale, x1: wd.bbox.x1 / scale, y1: wd.bbox.y1 / scale },
          })),
        });
  return layout(lines);
}

export function layout(lines: TessLine[]): OcrResult {
  let text = "";
  const words: OcrWord[] = [];
  for (const line of lines) {
    const ws = line.words.filter((w) => w.text.trim());
    ws.forEach((w, i) => {
      if (i > 0 && !touching(ws[i - 1], w)) text += " ";
      words.push({ text: w.text, start: text.length, end: text.length + w.text.length, box: w.bbox });
      text += w.text;
    });
    text += "\n";
  }
  return { text, words };
}

function touching(a: TessWord, b: TessWord): boolean {
  const charWidth = (a.bbox.x1 - a.bbox.x0) / Math.max(1, a.text.length);
  const gap = b.bbox.x0 - a.bbox.x1;
  const joiner = /[._@:\/\-=]$/.test(a.text) || /^[._@:\/\-=]/.test(b.text);
  return joiner && gap < charWidth * 1.0;
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
