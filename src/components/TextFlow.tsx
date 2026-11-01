import { useMemo } from "react";
import { detect } from "../core/detect";
import { Vault, mask, restore, segments } from "../core/mask";
import type { Finding } from "../core/types";
import type { SessionState } from "../lib/session";
import type { ModelStatus } from "../lib/useModel";
import { SAMPLES } from "../samples";
import { CopyButton } from "./CopyButton";
import { Findings } from "./Findings";
import { HighlightEditor } from "./HighlightEditor";

interface Props {
  state: SessionState;
  update: (p: Partial<SessionState>) => void;
  reset: () => void;
  model: { status: ModelStatus; progress: number; findings: Finding[] };
}

const MODEL_TEXT: Record<ModelStatus, string> = {
  off: "Off",
  loading: "Downloading model",
  ready: "On",
  running: "Scanning",
  error: "Could not load",
};

export function TextFlow({ state, update, reset, model }: Props) {
  const { text, reply, allowed, custom } = state;

  const all = useMemo(() => detect(text, { custom, extra: model.findings }), [text, custom, model.findings]);
  const findings = useMemo(() => all.filter((f) => !allowed.includes(f.value)), [all, allowed]);

  const working = useMemo(() => {
    const vault = new Vault(state.vault);
    const masked = mask(text, findings, vault);
    return { vault, masked };
  }, [text, findings, state.vault]);

  const outSegs = useMemo(() => segments(text, findings, new Vault(working.vault.entries())), [text, findings, working]);
  const restored = useMemo(() => restore(reply, working.vault), [reply, working]);

  const counts = { secret: 0, personal: 0, name: 0 };
  for (const f of findings) counts[f.category]++;

  const commit = () => update({ vault: working.vault.entries() });

  return (
    <>
      <section className="step">
        <div className="step-head">
          <h2>
            <span className="num">1</span> Paste what you want to ask about
          </h2>
          <div className="samples">
            <span className="muted">Try:</span>
            {SAMPLES.map((s) => (
              <button key={s.id} className="btn btn-ghost" onClick={() => update({ text: s.text, reply: "" })}>
                {s.label}
              </button>
            ))}
            {text && (
              <button className="btn btn-ghost" onClick={reset}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="panes">
          <div className="pane">
            <div className="pane-title">Your text</div>
            <HighlightEditor
              label="Your text"
              value={text}
              findings={findings}
              onChange={(v) => update({ text: v })}
              placeholder="Paste a log, stack trace, .env file, email or chat message…"
            />
          </div>
          <div className="pane">
            <div className="pane-title">
              Safe to send
              <span className="stats">
                <b className="c-secret">{counts.secret}</b> secrets · <b className="c-personal">{counts.personal}</b> personal ·{" "}
                {state.useModel ? (
                  <>
                    <b className="c-name">{counts.name}</b> names
                  </>
                ) : (
                  <span className="muted">names off</span>
                )}
              </span>
            </div>
            <pre className="output" data-testid="masked-output">
              {outSegs.map((s, i) =>
                s.tag ? (
                  <span key={i} className={`ph ph-${s.finding?.category}`}>{`<${s.tag}>`}</span>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
              {!text && <span className="muted">The masked version appears here as you type.</span>}
            </pre>
            <div className="pane-actions">
              <span onClick={commit}>
                <CopyButton text={working.masked} label="Copy safe text" disabled={!text} />
              </span>
              <span className="muted small">Placeholders stay the same across your session, so the AI can still reason about them.</span>
            </div>
          </div>
        </div>
        <div className="toolbar">
          <label className="toggle">
            <input type="checkbox" checked={state.useModel} onChange={(e) => update({ useModel: e.target.checked })} />
            <span>
              Detect names, companies and places with an on-device model{" "}
              <span className={`pill pill-${model.status}`}>
                {MODEL_TEXT[model.status]}
                {model.status === "loading" && model.progress > 0 && model.progress < 100 ? ` ${Math.round(model.progress)}%` : ""}
              </span>
            </span>
          </label>
          <span className="muted small">DistilBERT NER, 66 MB, downloaded once and cached by your browser.</span>
        </div>
        <Findings
          findings={findings.concat(all.filter((f) => allowed.includes(f.value)))}
          tagFor={(f) => working.vault.entries().find((e) => e.value === f.value)?.tag}
          allowed={allowed}
          onToggle={(v) => update({ allowed: allowed.includes(v) ? allowed.filter((x) => x !== v) : [...allowed, v] })}
          custom={custom}
          onCustom={(c) => update({ custom: c })}
        />
      </section>

      <section className="step">
        <div className="step-head">
          <h2>
            <span className="num">2</span> Paste the AI's reply to put your real values back
          </h2>
          {working.vault.size > 0 && (
            <div className="samples">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  commit();
                  update({ reply: exampleReply(working.vault.entries().map((e) => e.tag)) });
                }}
              >
                Use an example reply
              </button>
            </div>
          )}
        </div>
        <div className="panes">
          <div className="pane">
            <div className="pane-title">AI reply</div>
            <textarea
              className="plain-input"
              aria-label="AI reply"
              spellCheck={false}
              value={reply}
              onChange={(e) => {
                commit();
                update({ reply: e.target.value });
              }}
              placeholder="e.g. Your app can't reach <IP_ADDRESS_1> because the password for <PASSWORD_1> is wrong…"
            />
          </div>
          <div className="pane">
            <div className="pane-title">
              Restored
              <span className="stats">
                <b>{restored.restored.length}</b> values put back
              </span>
            </div>
            <pre className="output" data-testid="restored-output">
              {renderRestored(restored)}
              {!reply && <span className="muted">Your real values reappear here, only on this screen.</span>}
            </pre>
            {restored.unknown.length > 0 && (
              <p className="warn small">Not from this session: {restored.unknown.map((t) => `<${t}>`).join(", ")}</p>
            )}
            <div className="pane-actions">
              <CopyButton text={restored.text} label="Copy restored reply" disabled={!reply} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function exampleReply(tags: string[]): string {
  const pick = (prefix: string) => tags.find((t) => t.startsWith(prefix));
  const secret = tags.find((t) => !/^(EMAIL|PHONE|PERSON|ORG|LOCATION|IP_ADDRESS|USERNAME)_/.test(t)) ?? tags[0];
  const contact = pick("EMAIL_") ?? pick("PERSON_") ?? pick("PHONE_");
  const host = pick("IP_ADDRESS_");
  const lines = [`The error comes from <${secret}>. It is being rejected, so generate a new one and keep it out of source control.`];
  if (host) lines.push(`Also check that <${host}> accepts connections from your machine.`);
  if (contact) lines.push(`Once it's rotated, let <${contact}> know so nobody keeps using the old value.`);
  return lines.join("\n\n");
}

function renderRestored(r: ReturnType<typeof restore>) {
  const out = [];
  let pos = 0;
  r.restored.forEach((x, i) => {
    out.push(<span key={`t${i}`}>{r.text.slice(pos, x.start)}</span>);
    out.push(
      <mark key={`m${i}`} className="restored" title={`was <${x.tag}>`}>
        {x.value}
      </mark>,
    );
    pos = x.end;
  });
  out.push(<span key="end">{r.text.slice(pos)}</span>);
  return out;
}
