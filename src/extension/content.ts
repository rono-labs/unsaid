/// <reference types="chrome" />
import { detect, typeLabel } from "../core/detect";
import { Vault, mask, restore, type VaultEntry } from "../core/mask";
import type { Finding } from "../core/types";

const KEY = "unsaid.vault";
const MARK = "data-unsaid";
const TAG_HINT = /[A-Z]_\d/;

let vault = new Vault();
let bypassUntil = 0;
let replaying = false;
const sent: string[] = [];

async function loadVault() {
  try {
    const stored = await chrome.storage.session.get(KEY);
    vault = new Vault((stored[KEY] as VaultEntry[] | undefined) ?? []);
  } catch {
    vault = new Vault(vault.entries());
  }
}

function saveVault() {
  chrome.storage.session.set({ [KEY]: vault.entries() }).catch(() => undefined);
}

function editableFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  if (target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type === "text")) return target;
  const host = target.closest<HTMLElement>("[contenteditable=''], [contenteditable='true'], [contenteditable='plaintext-only']");
  return host;
}

function insertMasked(target: HTMLElement, text: string) {
  target.focus();
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    document.execCommand("insertText", false, text);
    return;
  }
  const data = new DataTransfer();
  data.setData("text/plain", text);
  replaying = true;
  try {
    const handled = !target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    if (!handled) document.execCommand("insertText", false, text);
  } finally {
    replaying = false;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") bypassUntil = Date.now() + 1000;
}

function onPaste(e: ClipboardEvent) {
  if (replaying || Date.now() < bypassUntil) return;
  const target = editableFrom(e.target);
  const text = e.clipboardData?.getData("text/plain");
  if (!target || !text) return;
  const findings = detect(text);
  if (findings.length === 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const masked = mask(text, findings, vault);
  sent.push(masked);
  insertMasked(target, masked);
  saveVault();
  toast(findings);
}

function toast(findings: Finding[]) {
  document.querySelector(`[${MARK}=toast]`)?.remove();
  const host = document.createElement("div");
  host.setAttribute(MARK, "toast");
  const root = host.attachShadow({ mode: "open" });
  const kinds = [...new Set(findings.map((f) => typeLabel(f.type)))];
  const secrets = findings.filter((f) => f.category === "secret").length;
  root.innerHTML = `
    <style>
      .t { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; max-width: 360px; padding: 12px 14px;
        background: #14161c; color: #e8eaf0; border-radius: 12px; font: 13px/1.45 system-ui, sans-serif;
        box-shadow: 0 8px 30px rgb(0 0 0 / 0.3); display: grid; gap: 4px; overflow: hidden; padding-left: 18px; }
      b { color: #fff; font-size: 14px; }
      .k { color: #aab0bd; }
      .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${secrets ? "#ff6b57" : "#f5b840"}; }
      button { position: absolute; top: 6px; right: 8px; border: 0; background: none; color: #aab0bd; font-size: 16px; cursor: pointer; }
    </style>
    <div class="t" role="status"><span class="bar"></span>
      <b>Unsaid hid ${findings.length} item${findings.length === 1 ? "" : "s"}</b>
      <span class="k"></span>
      <span class="k">Ctrl+Shift+V pastes the original.</span>
      <button aria-label="Dismiss">×</button>
    </div>`;
  root.querySelector(".k")!.textContent = kinds.slice(0, 4).join(", ") + (kinds.length > 4 ? ", …" : "");
  root.querySelector("button")!.addEventListener("click", () => host.remove());
  document.documentElement.append(host);
  setTimeout(() => host.remove(), 7000);
}

const restoredRanges: { node: Text; start: number; end: number }[] = [];

function restoreIn(root: Node) {
  if (vault.size === 0) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || !n.nodeValue || !TAG_HINT.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      if (p.closest("textarea, input, [contenteditable=''], [contenteditable='true'], [contenteditable='plaintext-only'], script, style"))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  for (const node of nodes) {
    const value = (node.nodeValue ?? "").trim();
    if (value.length > 8 && sent.some((m) => m.includes(value))) continue;
    const r = restore(node.nodeValue ?? "", vault);
    if (r.restored.length === 0) continue;
    node.nodeValue = r.text;
    for (const x of r.restored) restoredRanges.push({ node, start: x.start, end: x.end });
  }
  paintHighlights();
}

function paintHighlights() {
  if (!("highlights" in CSS)) return;
  const live = restoredRanges.filter((r) => r.node.isConnected && r.end <= (r.node.nodeValue?.length ?? 0));
  restoredRanges.splice(0, restoredRanges.length, ...live);
  const ranges = live.map((r) => {
    const range = new Range();
    range.setStart(r.node, r.start);
    range.setEnd(r.node, r.end);
    return range;
  });
  CSS.highlights.set("unsaid-restored", new Highlight(...ranges));
}

function installStyles() {
  const style = document.createElement("style");
  style.setAttribute(MARK, "style");
  style.textContent = "::highlight(unsaid-restored) { background-color: rgb(34 197 94 / 0.25); color: inherit; }";
  document.head.append(style);
}

let pending = new Set<Node>();
let scheduled = false;

function schedule(node: Node) {
  pending.add(node);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const batch = pending;
    pending = new Set();
    for (const n of batch) if (n.isConnected) restoreIn(n);
  });
}

async function main() {
  await loadVault();
  installStyles();
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("paste", onPaste, true);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes[KEY]) {
      vault = new Vault((changes[KEY].newValue as VaultEntry[] | undefined) ?? []);
      schedule(document.body);
    }
  });
  new MutationObserver((records) => {
    for (const r of records) schedule(r.type === "characterData" ? r.target.parentNode ?? r.target : r.target);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  restoreIn(document.body);
}

main();
