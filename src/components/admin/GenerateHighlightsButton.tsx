"use client";

import { useState } from "react";

export function GenerateHighlightsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/highlights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(data.error ?? "Error");
      } else if (data.generated) {
        setResult(`${data.updated ? "Updated" : "Generated"} ${data.count} highlights`);
      } else {
        setResult(`No highlights: ${data.reason}`);
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2"
        style={{
          borderRadius: 12,
          padding: "10px 20px",
          border: "1px solid var(--color-border-light)",
          background: "transparent",
          color: "var(--color-text-secondary)",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, color: "var(--color-text-secondary)" }}
        >
          auto_awesome
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {loading ? "Generating..." : "Generate Highlights"}
        </span>
      </button>
      {result && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            color: result.startsWith("Generated") ? "var(--color-success)" : "var(--color-error-soft)",
          }}
        >
          {result}
        </span>
      )}
    </div>
  );
}
