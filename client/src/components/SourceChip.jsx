import { useState } from "react";

export function SourceChip({ source }) {
  const [open, setOpen] = useState(false);
  const pageLabel = source.page_start === source.page_end
    ? `Page ${source.page_start}`
    : `Pages ${source.page_start}-${source.page_end}`;

  return (
    <button className="source-chip" onClick={() => setOpen((v) => !v)}>
      <strong>{pageLabel}</strong>
      {source.section ? ` — ${source.section}` : ""}
      {" "}· {Math.round(source.score * 100)}% match
      {open && <div className="source-snippet">"{source.snippet}"</div>}
    </button>
  );
}
