"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt?: string;
}

export function ImageLightbox({ src, alt = "Attachment" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          objectFit: "cover",
          maxHeight: 400,
          display: "block",
          cursor: "pointer",
        }}
      />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute flex items-center justify-center"
            style={{
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff" }}>
              close
            </span>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
              cursor: "default",
            }}
          />
        </div>
      )}
    </>
  );
}
