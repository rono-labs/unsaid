import { gunzipSync, strFromU8, unzipSync } from "fflate";
import { useRef, useState } from "react";
import { ROTATE, audit, parseExport, type AuditReport } from "../core/audit";
import { typeLabel } from "../core/detect";
import { preview } from "./Findings";

const SAMPLE = `${import.meta.env.BASE_URL}samples/chatgpt-export.json.gz`;

async function readExport(file: Blob, name: string): Promise<unknown> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".zip")) {
    const files = unzipSync(bytes, { filter: (f) => f.name.endsWith("conversations.json") });
    const entry = Object.values(files)[0];
    if (!entry) throw new Error("No conversations.json inside that zip.");
    return JSON.parse(strFromU8(entry));
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return JSON.parse(strFromU8(gunzipSync(bytes)));
  return JSON.parse(strFromU8(bytes));
}

const fmt = (t: number | null) =>
  t === null ? "" : new Date(t * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function AuditFlow() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (file: Blob, name: string) => {
    setBusy(true);
    setError("");
    try {
      setReport(audit(parseExport(await readExport(file, name))));
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  };

  const secrets = report?.items.filter((i) => i.category === "secret") ?? [];
  const personal = report?.items.filter((i) => i.category === "personal") ?? [];
  const affected = new Set(secrets.flatMap((i) => i.conversations.map((c) => c.id))).size;

  return (
    <section className="step">
      <div className="step-head">
        <h2>
          <span className="num">1</span> Check what you have already pasted into AI chats
        </h2>
        <div className="samples">
          <button className="btn btn-ghost" onClick={async () => run(await (await fetch(SAMPLE)).blob(), SAMPLE)}>
            Try a sample ChatGPT export
          </button>
          <button className="btn btn-ghost" onClick={() => input.current?.click()}>
            Choose export
          </button>
          <input
            ref={input}
            type="file"
            accept=".zip,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(f, f.name);
            }}
          />
        </div>
      </div>

      {!report && (
        <div
          className="dropzone audit-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) run(f, f.name);
          }}
        >
          <div className="drop-hint">
            <strong>{busy ? "Scanning…" : "Drop your ChatGPT or Claude export here"}</strong>
            <span className="muted">
              ChatGPT: Settings → Data controls → Export data. Claude: Settings → Privacy → Export data.
              <br />
              The zip is read in this tab. Only your own messages are scanned.
            </span>
          </div>
        </div>
      )}
      {error && <p className="warn">{error}</p>}

      {report && (
        <>
          <div className="audit-summary">
            <div className={`big ${secrets.length ? "bad" : "good"}`}>
              <b data-testid="audit-secrets">{secrets.length}</b>
              <span>secrets pasted</span>
            </div>
            <div className="big">
              <b>{affected}</b>
              <span>of {report.conversations} chats contain one</span>
            </div>
            <div className="big">
              <b>{personal.length}</b>
              <span>personal details</span>
            </div>
            <div className="big">
              <b>{report.messages}</b>
              <span>of your messages scanned</span>
            </div>
          </div>
          {secrets.length > 0 && <h3 className="audit-h">Rotate these first</h3>}
          <ul className="audit-list">
            {report.items.map((it) => {
              const rotate = ROTATE[it.type];
              return (
                <li key={it.value} className={`sev-${it.category}`}>
                  <span className={`swatch sw-${it.category}`} />
                  <div className="what">
                    <div>
                      <b>{typeLabel(it.type)}</b> <code>{preview(it.value)}</code>
                      {it.count > 1 && <span className="muted"> pasted {it.count} times</span>}
                    </div>
                    <div className="muted small">
                      {it.conversations
                        .slice(0, 3)
                        .map((c) => `“${c.title}”`)
                        .join(", ")}
                      {it.conversations.length > 3 && ` and ${it.conversations.length - 3} more`}
                      {it.first !== null && ` · first ${fmt(it.first)}`}
                    </div>
                  </div>
                  {rotate ? (
                    <a className="btn" href={rotate.url} target="_blank" rel="noreferrer">
                      {rotate.label}
                    </a>
                  ) : it.category === "secret" ? (
                    <span className="hint">Change it where it is used</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="pane-actions">
            <button className="btn" onClick={() => setReport(null)}>
              Scan another export
            </button>
            <span className="muted small">
              Deleting a chat does not revoke a key. Rotate anything that was live when you pasted it.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
