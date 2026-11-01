import { useEffect, useMemo, useRef, useState } from "react";
import { detect, repairOcrFindings, typeLabel } from "../core/detect";
import type { Finding } from "../core/types";
import { runNer } from "../lib/nerClient";
import { Vault, mask } from "../core/mask";
import { boxesFor, recognize, type Box, type OcrResult } from "../lib/ocr";
import { CopyButton } from "./CopyButton";
import { preview } from "../lib/format";

interface Props {
  useModel: boolean;
  modelReady: boolean;
  custom: string[];
}

type Phase = "idle" | "reading" | "done" | "error";

const SAMPLE = `${import.meta.env.BASE_URL}samples/terminal.png`;

export function ScreenshotFlow({ useModel, modelReady, custom }: Props) {
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = (blob: Blob) => {
    setImage((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { url: URL.createObjectURL(blob), blob };
    });
    setOcr(null);
    setFindings([]);
    setShown([]);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) load(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    setPhase("reading");
    setProgress(0);
    (async () => {
      try {
        const result = await recognize(image.blob, setProgress);
        const extra = useModel && modelReady ? await runNer(result.text).catch(() => []) : [];
        if (cancelled) return;
        setOcr(result);
        setFindings(repairOcrFindings(result.text, detect(result.text, { custom, extra })));
        setPhase("done");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [image, useModel, modelReady, custom]);

  const active = useMemo(() => findings.filter((f) => !shown.includes(f.value)), [findings, shown]);
  const boxes = useMemo(() => (ocr ? boxesFor(active, ocr.words) : []), [ocr, active]);

  useEffect(() => {
    if (!image || !canvas.current) return;
    const img = new Image();
    img.onload = () => {
      const c = canvas.current;
      if (!c) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      for (const { finding, box } of boxes) paintBox(ctx, box, finding);
    };
    img.src = image.url;
  }, [image, boxes]);

  const download = () => {
    canvas.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "redacted.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };

  const unique = [...new Map(findings.map((f) => [f.value, f])).values()];

  return (
    <section className="step">
      <div className="step-head">
        <h2>
          <span className="num">1</span> Drop, paste or pick a screenshot
        </h2>
        <div className="samples">
          <button
            className="btn btn-ghost"
            onClick={async () => load(await (await fetch(SAMPLE)).blob())}
          >
            Try a sample screenshot
          </button>
          <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            Choose image
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
          />
        </div>
      </div>
      <div
        className={`dropzone ${image ? "has-image" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type.startsWith("image/")) load(f);
        }}
      >
        {!image && (
          <div className="drop-hint">
            <strong>Drop a screenshot here</strong>
            <span className="muted">or press Ctrl+V. Text is read on your device with Tesseract OCR.</span>
          </div>
        )}
        {image && <canvas ref={canvas} className="shot" data-testid="redacted-canvas" />}
        {phase === "reading" && (
          <div className="overlay">
            Reading text… {Math.round(progress * 100)}%
          </div>
        )}
      </div>
      {phase === "error" && <p className="warn">Could not read that image. Try a PNG or JPG screenshot.</p>}
      {phase === "done" && (
        <div className="shot-foot">
          <div className="findings">
            <p>
              <b>{boxes.length}</b> regions covered across <b>{unique.length - shown.length}</b> values.
            </p>
            <ul>
              {unique.map((f) => {
                const visible = shown.includes(f.value);
                return (
                  <li key={f.value} className={visible ? "allowed" : ""}>
                    <span className={`swatch sw-${f.category}`} />
                    <span className="kind">{typeLabel(f.type)}</span>
                    <span className="val">{preview(f.value)}</span>
                    <button
                      className="link"
                      onClick={() => setShown(visible ? shown.filter((v) => v !== f.value) : [...shown, f.value])}
                    >
                      {visible ? "Cover" : "Uncover"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="pane-actions">
            <button className="btn btn-primary" onClick={download}>
              Download redacted PNG
            </button>
            {ocr && <CopyButton text={mask(ocr.text, active, new Vault())} label="Copy text as safe text" />}
          </div>
          {ocr && (
            <details className="ocr-text">
              <summary>Text read from the image</summary>
              <pre className="output" data-testid="ocr-text">{mask(ocr.text, active, new Vault())}</pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function paintBox(ctx: CanvasRenderingContext2D, b: Box, f: Finding) {
  const pad = 3;
  const x = b.x0 - pad;
  const y = b.y0 - pad;
  const w = b.x1 - b.x0 + pad * 2;
  const h = b.y1 - b.y0 + pad * 2;
  const color = f.category === "secret" ? "#ff6b57" : f.category === "personal" ? "#f5b840" : "#6b9bff";
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  const label = typeLabel(f.type).toUpperCase();
  ctx.font = `600 ${Math.max(9, Math.min(14, h * 0.55))}px ui-monospace, monospace`;
  if (ctx.measureText(label).width < w - 10) {
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 6, y + h / 2);
  }
}
