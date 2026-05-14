/**
 * Renders text with **bold** markdown markers as <strong> elements.
 */
export function BoldText({ text, className, style }: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <span className={className} style={style}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} style={{ color: "#e5deff", fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </span>
  );
}
