"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/header/LanguageSwitcher";

interface Props {
  links: Array<{ label: string; href: string }>;
}

export function MobileNav({ links }: Props) {
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="btn-icon flex items-center justify-center"
        aria-label={t("toggleNav")}
        style={{ width: 36, height: 36 }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 28, width: 28, height: 28, color: "var(--color-accent-silver)" }}
        >
          {open ? "close" : "menu"}
        </span>
      </button>

      {open && (
        <nav
          className="flex flex-col"
          style={{
            position: "fixed",
            top: 68,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--color-bg-primary)",
            borderTop: "1px solid var(--color-border-light)",
            padding: "16px 24px",
            gap: 4,
            zIndex: 50,
            overflowY: "auto",
          }}
        >
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center no-underline"
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  letterSpacing: 1,
                  color: isActive ? "var(--color-accent-gold)" : "var(--color-accent-silver)",
                  background: isActive ? "var(--color-bg-card)" : "transparent",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </div>
  );
}
