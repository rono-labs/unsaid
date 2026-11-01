export function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function ibanValid(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const code = ch.charCodeAt(0);
    const chunk = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const c of chunk) rem = (rem * 10 + (c.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

export function shannon(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function ipv4Valid(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => n > 255)) return false;
  if (ip.split(".").some((p) => p.length > 1 && p.startsWith("0"))) return false;
  const [a] = parts;
  if (ip === "0.0.0.0" || a === 127 || ip === "255.255.255.255") return false;
  if (parts.every((n) => n === 255 || n === 0)) return false;
  return true;
}

export function ipv6Valid(ip: string): boolean {
  if (ip === "::" || ip === "::1") return false;
  try {
    new URL(`http://[${ip}]/`);
    return true;
  } catch {
    return false;
  }
}

const PLACEHOLDER =
  /^(?:\$\{[^}]*\}|\$\(?[A-Za-z_][A-Za-z0-9_]*\)?|\{\{[^}]*\}\}|<[^>]*>|\[[^\]]*\]|%[A-Za-z_]+%|x{4,}|X{4,}|\*{3,}|\.{3,}|•+|changeme|change[_-]?me|password|passwd|secret|token|redacted|hidden|masked|example|sample|dummy|placeholder|null|none|nil|true|false|undefined|your[_-][\w-]*|my[_-][\w-]*|replace[_-]?me|todo|tbd|str|string|int|bool|any|required|optional)$/i;

export function isPlaceholder(v: string): boolean {
  const s = v.replace(/^["'`]|["'`]$/g, "");
  if (s.length < 4) return true;
  if (PLACEHOLDER.test(s)) return true;
  if (/^(?:process\.env|os\.environ|os\.getenv|env\(|getenv|config\.|settings\.|self\.|this\.)/i.test(s)) return true;
  if (/[()]/.test(s) && /^[A-Za-z_][\w.]*\(/.test(s)) return true;
  if (/^(.)\1+$/.test(s)) return true;
  return false;
}
