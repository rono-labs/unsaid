import { useState } from "react";
import "./App.css";
import { NetworkBadge } from "./components/NetworkBadge";
import { ScreenshotFlow } from "./components/ScreenshotFlow";
import { TextFlow } from "./components/TextFlow";
import { useSession } from "./lib/session";
import { useModelFindings } from "./lib/useModel";

type Tab = "text" | "image";

const REPO_URL = import.meta.env.VITE_REPO_URL as string | undefined;

export default function App() {
  const { state, update, reset } = useSession();
  const [tab, setTab] = useState<Tab>("text");
  const model = useModelFindings(tab === "text" ? state.text : "", state.useModel);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>Unsaid</h1>
            <p className="tagline">Ask the AI anything without handing it your secrets.</p>
          </div>
        </div>
        <NetworkBadge />
      </header>

      <p className="intro">
        Paste a log, an <code>.env</code> file or an email. Unsaid swaps keys, passwords and personal details for placeholders
        like <code className="ph ph-secret">&lt;GITHUB_TOKEN_1&gt;</code> before you send it to ChatGPT, Claude or Gemini, then
        puts the real values back into the answer. Everything runs in this tab.
      </p>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "text"} className={tab === "text" ? "on" : ""} onClick={() => setTab("text")}>
          Text
        </button>
        <button role="tab" aria-selected={tab === "image"} className={tab === "image" ? "on" : ""} onClick={() => setTab("image")}>
          Screenshot
        </button>
      </nav>

      {tab === "text" ? (
        <TextFlow state={state} update={update} reset={reset} model={model} />
      ) : (
        <ScreenshotFlow useModel={state.useModel} modelReady={model.status === "ready" || model.status === "running"} custom={state.custom} />
      )}

      <footer className="foot">
        <span>No account, no server, no analytics. Your text never leaves this browser tab.</span>
        {REPO_URL && (
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        )}
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#14161c" />
      <path d="M9 14h22M9 20h9M22 20h9M9 26h14" stroke="#e8eaf0" strokeWidth="3" strokeLinecap="round" />
      <rect x="17" y="17" width="9" height="6" rx="2" fill="#ff6b57" />
    </svg>
  );
}
