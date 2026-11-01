import { RULES, TYPES, assignedValue, looksLikeGenericSecret } from "./rules";
import type { Finding, Rule } from "./types";

const compiled = new Map<Rule, RegExp>();

function regexFor(rule: Rule): RegExp {
  let re = compiled.get(rule);
  if (!re) {
    const flags = rule.pattern.flags.includes("d") ? rule.pattern.flags : rule.pattern.flags + "d";
    re = new RegExp(rule.pattern.source, flags);
    compiled.set(rule, re);
  }
  re.lastIndex = 0;
  return re;
}

function isAssignmentRule(rule: Rule): boolean {
  return rule.group === undefined && rule.pattern.source.includes("(?:=>|:=|[:=])");
}

function looksFake(value: string): boolean {
  return /([xX*#•.])\1{5,}/.test(value) || /your[\-_]|\.\.\.$|<[^>]+>|\$\{[^}]*\}|example|dummy|placeholder/i.test(value);
}

export function runRules(text: string): Finding[] {
  const out: Finding[] = [];
  for (const rule of RULES) {
    const re = regexFor(rule);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      let idx = 0;
      if (isAssignmentRule(rule)) idx = m[2] !== undefined ? 2 : m[3] !== undefined ? 3 : 4;
      else if (rule.group !== undefined) idx = rule.group;
      const span = m.indices?.[idx];
      const value = m[idx];
      if (!span || value === undefined) continue;
      if (isAssignmentRule(rule) && !assignedValue(value, m)) continue;
      if (rule.validate && !rule.validate(value, m, text)) continue;
      if (rule.category === "secret" && rule.type !== "PRIVATE_KEY" && looksFake(value)) continue;
      out.push({
        start: span[0],
        end: span[1],
        value,
        type: rule.type,
        category: rule.category,
        source: "rule",
        score: rule.score ?? 0.9,
      });
    }
  }
  out.push(...genericTokens(text));
  return out;
}

function genericTokens(text: string): Finding[] {
  const out: Finding[] = [];
  const re = /[A-Za-z0-9_\-+\/]{24,}={0,2}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const token = m[0].replace(/[.=]+$/, "").replace(/^[.\/]+/, "");
    const start = m.index + m[0].indexOf(token);
    const before = text.slice(Math.max(0, start - 40), start);
    if (!looksLikeGenericSecret(token, before)) continue;
    out.push({
      start,
      end: start + token.length,
      value: token,
      type: "SECRET",
      category: "secret",
      source: "rule",
      score: 0.6,
    });
  }
  return out;
}

export function customFindings(text: string, terms: string[]): Finding[] {
  const out: Finding[] = [];
  for (const term of terms) {
    const t = term.trim();
    if (t.length < 2) continue;
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        type: "CUSTOM",
        category: "secret",
        source: "custom",
        score: 1,
      });
    }
  }
  return out;
}

export function resolve(findings: Finding[]): Finding[] {
  const ranked = [...findings].sort(
    (a, b) => b.score - a.score || b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const kept: Finding[] = [];
  for (const f of ranked) {
    const clash = kept.find((k) => f.start < k.end && k.start < f.end);
    if (!clash) kept.push(f);
  }
  return kept.sort((a, b) => a.start - b.start);
}

export function detect(text: string, opts: { custom?: string[]; extra?: Finding[] } = {}): Finding[] {
  return resolve([...runRules(text), ...customFindings(text, opts.custom ?? []), ...(opts.extra ?? [])]);
}

export function typeLabel(type: string): string {
  return TYPES[type]?.label ?? type;
}
