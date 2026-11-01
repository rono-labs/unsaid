import { useState } from "react";
import { typeLabel } from "../core/detect";
import type { Category, Finding } from "../core/types";

interface Item {
  value: string;
  type: string;
  category: Category;
  count: number;
  tag?: string;
}

const CATEGORY_NAME: Record<Category, string> = { secret: "Secrets", personal: "Personal", name: "Names & places" };

export function preview(v: string): string {
  const flat = v.replace(/\s+/g, " ");
  if (flat.length <= 10) return flat.slice(0, 2) + "•".repeat(Math.max(1, flat.length - 2));
  return `${flat.slice(0, 4)}…${flat.slice(-3)}`;
}

interface Props {
  findings: Finding[];
  tagFor: (f: Finding) => string | undefined;
  allowed: string[];
  onToggle: (value: string) => void;
  custom: string[];
  onCustom: (terms: string[]) => void;
}

export function Findings({ findings, tagFor, allowed, onToggle, custom, onCustom }: Props) {
  const [term, setTerm] = useState("");
  const items = new Map<string, Item>();
  for (const f of findings) {
    const it = items.get(f.value);
    if (it) it.count++;
    else items.set(f.value, { value: f.value, type: f.type, category: f.category, count: 1, tag: tagFor(f) });
  }
  const groups = (["secret", "personal", "name"] as Category[])
    .map((c) => ({ c, list: [...items.values()].filter((i) => i.category === c) }))
    .filter((g) => g.list.length);

  return (
    <div className="findings">
      {groups.length === 0 && <p className="muted">Nothing sensitive found yet. Paste something or try a sample.</p>}
      {groups.map(({ c, list }) => (
        <div key={c} className="group">
          <h4>
            <span className={`swatch sw-${c}`} />
            {CATEGORY_NAME[c]} <span className="muted">({list.length})</span>
          </h4>
          <ul>
            {list.map((i) => {
              const shown = allowed.includes(i.value);
              return (
                <li key={i.value} className={shown ? "allowed" : ""}>
                  <code className="tag">{shown ? "visible" : i.tag ? `<${i.tag}>` : typeLabel(i.type)}</code>
                  <span className="kind">{typeLabel(i.type)}</span>
                  <span className="val" title={shown ? i.value : "Hidden from the AI"}>
                    {preview(i.value)}
                    {i.count > 1 && <span className="muted"> ×{i.count}</span>}
                  </span>
                  <button className="link" onClick={() => onToggle(i.value)}>
                    {shown ? "Hide" : "Let AI see"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <form
        className="custom"
        onSubmit={(e) => {
          e.preventDefault();
          const t = term.trim();
          if (t.length >= 2 && !custom.includes(t)) onCustom([...custom, t]);
          setTerm("");
        }}
      >
        <input
          aria-label="Always hide a word"
          placeholder="Always hide a word, e.g. a project codename"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn" type="submit" disabled={term.trim().length < 2}>
          Add
        </button>
      </form>
      {custom.length > 0 && (
        <div className="chips">
          {custom.map((t) => (
            <button key={t} className="chip" onClick={() => onCustom(custom.filter((x) => x !== t))} title="Remove">
              {t} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
