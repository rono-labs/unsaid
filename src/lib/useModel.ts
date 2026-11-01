import { useEffect, useState } from "react";
import type { Finding } from "../core/types";
import { loadNer, onNerProgress, runNer } from "./nerClient";

export type ModelStatus = "off" | "loading" | "ready" | "running" | "error";

export function useModelFindings(text: string, enabled: boolean) {
  const [status, setStatus] = useState<ModelStatus>("off");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ text: string; findings: Finding[] }>({ text: "", findings: [] });

  useEffect(() => onNerProgress(setProgress), []);

  useEffect(() => {
    if (!enabled) {
      setStatus("off");
      return;
    }
    setStatus((s) => (s === "off" || s === "error" ? "loading" : s));
    loadNer()
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));
  }, [enabled]);

  const live = status === "ready" || status === "running";

  useEffect(() => {
    if (!enabled || !live) return;
    if (!text.trim()) {
      setResult({ text, findings: [] });
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setStatus("running");
      runNer(text)
        .then((findings) => {
          if (!cancelled) setResult({ text, findings });
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setStatus("ready");
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, enabled, live]);

  const findings = enabled && result.text === text ? result.findings : [];
  return { status, progress, findings };
}
