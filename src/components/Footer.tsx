const footerLinks = ["Terms", "Privacy", "Support", "Contact"];

export function Footer() {
  return (
    <footer
      className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 px-4 sm:px-12 py-6"
      style={{
        background: "var(--color-bg-footer)",
        borderTop: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex flex-col gap-1.5">
        <span
          className="text-lg font-bold"
          style={{ color: "var(--color-text-accent)", fontFamily: "var(--font-display)" }}
        >
          Pencachi
        </span>
        <span className="text-xs" style={{ color: "var(--color-accent-silver)" }}>
          © 2026 Pencachi Arena Editorial. All rights reserved.
        </span>
      </div>
      <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
        {footerLinks.map((link) => (
          <span
            key={link}
            className="text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            {link}
          </span>
        ))}
      </div>
    </footer>
  );
}
