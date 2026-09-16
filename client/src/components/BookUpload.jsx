import { useRef, useState } from "react";
import { apiErrorMessage } from "../api/client.js";

export function BookUpload({ onUpload }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpload(file, file.name.replace(/\.pdf$/i, ""));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="upload-panel">
      <div
        className={`upload-dropzone ${dragActive ? "drag-active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {busy ? (
          "Uploading..."
        ) : (
          <>
            Drop a PDF here or{" "}
            <label className="upload-label">
              browse
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          </>
        )}
      </div>
      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}
