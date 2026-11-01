import { useRef } from "react";
import { segments } from "../core/mask";
import type { Finding } from "../core/types";

interface Props {
  value: string;
  findings: Finding[];
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}

export function HighlightEditor({ value, findings, onChange, placeholder, label }: Props) {
  const backdrop = useRef<HTMLDivElement>(null);
  const segs = segments(value, findings);

  return (
    <div className="editor">
      <div className="editor-backdrop" ref={backdrop} aria-hidden="true">
        {segs.map((s, i) =>
          s.finding ? (
            <mark key={i} className={`hl hl-${s.finding.category}`}>
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
        {"\n"}
      </div>
      <textarea
        className="editor-input"
        aria-label={label}
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (backdrop.current) {
            backdrop.current.scrollTop = e.currentTarget.scrollTop;
            backdrop.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      />
    </div>
  );
}
