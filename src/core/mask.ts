import type { Finding } from "./types";

export interface VaultEntry {
  tag: string;
  value: string;
  type: string;
}

export class Vault {
  private byValue = new Map<string, VaultEntry>();
  private byTag = new Map<string, VaultEntry>();
  private counters = new Map<string, number>();

  constructor(entries: VaultEntry[] = []) {
    for (const e of entries) this.add(e);
  }

  private add(e: VaultEntry) {
    this.byValue.set(e.value, e);
    this.byTag.set(e.tag, e);
    const n = Number(e.tag.match(/_(\d+)$/)?.[1] ?? 0);
    this.counters.set(e.type, Math.max(this.counters.get(e.type) ?? 0, n));
  }

  tagFor(value: string, type: string): string {
    const known = this.byValue.get(value);
    if (known) return known.tag;
    const n = (this.counters.get(type) ?? 0) + 1;
    const entry = { tag: `${type}_${n}`, value, type };
    this.add(entry);
    return entry.tag;
  }

  lookup(tag: string): VaultEntry | undefined {
    return this.byTag.get(tag);
  }

  entries(): VaultEntry[] {
    return [...this.byTag.values()];
  }

  get size(): number {
    return this.byTag.size;
  }
}

export interface Segment {
  text: string;
  finding?: Finding;
  tag?: string;
}

export function segments(text: string, findings: Finding[], vault?: Vault): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const f of [...findings].sort((a, b) => a.start - b.start)) {
    if (f.start < pos) continue;
    if (f.start > pos) out.push({ text: text.slice(pos, f.start) });
    out.push({ text: f.value, finding: f, tag: vault?.tagFor(f.value, f.type) });
    pos = f.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

export function mask(text: string, findings: Finding[], vault: Vault): string {
  return segments(text, findings, vault)
    .map((s) => (s.tag ? `<${s.tag}>` : s.text))
    .join("");
}

const TAG_RE = /(?:<|&lt;|\[|\{\{?|«)?\s?\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_\d+)\b\s?(?:>|&gt;|\]|\}\}?|»)?/g;

export interface RestoreResult {
  text: string;
  restored: { tag: string; value: string; start: number; end: number }[];
  unknown: string[];
}

export function restore(text: string, vault: Vault): RestoreResult {
  const restored: RestoreResult["restored"] = [];
  const unknown = new Set<string>();
  let out = "";
  let pos = 0;
  for (const m of text.matchAll(TAG_RE)) {
    const tag = m[1];
    const entry = vault.lookup(tag);
    const bracketed = m[0].trim() !== tag;
    if (!entry) {
      if (bracketed) unknown.add(tag);
      continue;
    }
    const lead = m[0].match(/^\s*/)?.[0] ?? "";
    const trail = m[0].match(/\s*$/)?.[0] ?? "";
    const core = m[0].trim();
    const keepLead = core.startsWith(tag) ? lead : "";
    const keepTrail = core.endsWith(tag) ? trail : "";
    out += text.slice(pos, m.index) + keepLead;
    const start = out.length;
    out += entry.value;
    restored.push({ tag, value: entry.value, start, end: out.length });
    out += keepTrail;
    pos = m.index + m[0].length;
  }
  out += text.slice(pos);
  return { text: out, restored, unknown: [...unknown] };
}
