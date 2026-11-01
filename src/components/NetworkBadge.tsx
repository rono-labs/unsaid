import { useEffect, useState } from "react";
import { onWorkerHosts } from "../lib/nerClient";

export function NetworkBadge() {
  const [foreign, setForeign] = useState<string[]>([]);

  useEffect(() => {
    const seen = new Set<string>();
    const check = (entries: PerformanceEntryList) => {
      for (const e of entries) {
        const origin = new URL(e.name, location.href).origin;
        if (origin !== location.origin && !e.name.startsWith("data:") && !e.name.startsWith("blob:")) seen.add(new URL(e.name).host);
      }
      setForeign([...seen]);
    };
    check(performance.getEntriesByType("resource"));
    const obs = new PerformanceObserver((list) => check(list.getEntries()));
    obs.observe({ type: "resource", buffered: true });
    const off = onWorkerHosts((hosts) => {
      hosts.forEach((h) => seen.add(h));
      setForeign([...seen]);
    });
    return () => {
      obs.disconnect();
      off();
    };
  }, []);

  const clean = foreign.length === 0;
  return (
    <div className={`netbadge ${clean ? "ok" : "warn"}`} title={clean ? "" : `Downloads from: ${foreign.join(", ")}`}>
      <span className="dot" />
      {clean ? "0 requests to other sites" : `Model files from ${foreign.join(", ")}; your text stays here`}
    </div>
  );
}
