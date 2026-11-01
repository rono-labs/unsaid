export function preview(v: string): string {
  const flat = v.replace(/\s+/g, " ");
  if (flat.length <= 12) return `${flat.slice(0, 2)}•••`;
  return `${flat.slice(0, 4)}…${flat.slice(-3)}`;
}
