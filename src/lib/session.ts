import { useEffect, useState } from "react";
import type { VaultEntry } from "../core/mask";

const KEY = "unsaid.session.v1";

export interface SessionState {
  text: string;
  reply: string;
  vault: VaultEntry[];
  allowed: string[];
  custom: string[];
  useModel: boolean;
}

const EMPTY: SessionState = { text: "", reply: "", vault: [], allowed: [], custom: [], useModel: false };

function read(): SessionState {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function useSession() {
  const [state, setState] = useState<SessionState>(read);
  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);
  const update = (patch: Partial<SessionState>) => setState((s) => ({ ...s, ...patch }));
  const reset = () => setState({ ...EMPTY, useModel: state.useModel });
  return { state, update, reset };
}
