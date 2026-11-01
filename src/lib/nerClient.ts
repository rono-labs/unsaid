import type { Finding } from "../core/types";

type Msg =
  | { id: number; kind: "ready" }
  | { id: number; kind: "result"; findings: Finding[] }
  | { id: number; kind: "error"; message: string }
  | { kind: "progress"; progress: number }
  | { kind: "hosts"; hosts: string[] };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: Finding[]) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(p: number) => void>();
const hostListeners = new Set<(hosts: string[]) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/ner.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<Msg>) => {
    const msg = e.data;
    if (msg.kind === "hosts") {
      hostListeners.forEach((fn) => fn(msg.hosts));
      return;
    }
    if (msg.kind === "progress") {
      progressListeners.forEach((fn) => fn(msg.progress));
      return;
    }
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.kind === "error") p.reject(new Error(msg.message));
    else p.resolve(msg.kind === "result" ? msg.findings : []);
  };
  return worker;
}

function send(kind: "load" | "run", text?: string): Promise<Finding[]> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, kind, text });
  });
}

export const loadNer = () => send("load").then(() => undefined);
export const runNer = (text: string) => send("run", text);
export function onNerProgress(fn: (p: number) => void) {
  progressListeners.add(fn);
  return () => {
    progressListeners.delete(fn);
  };
}

export function onWorkerHosts(fn: (hosts: string[]) => void) {
  hostListeners.add(fn);
  return () => {
    hostListeners.delete(fn);
  };
}
