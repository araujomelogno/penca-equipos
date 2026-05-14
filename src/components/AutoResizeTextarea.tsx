"use client";

import { useRef, useEffect, useCallback, type TextareaHTMLAttributes } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & {
  maxRows?: number;
};

export function AutoResizeTextarea({ maxRows = 6, style, onChange, value, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
    const maxHeight = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [maxRows]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      style={{
        resize: "none",
        ...style,
      }}
      {...rest}
    />
  );
}
