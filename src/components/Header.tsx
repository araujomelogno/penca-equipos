import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/Logo";
import { ProfileMenu } from "@/components/header/ProfileMenu";
import { MobileNav } from "@/components/header/MobileNav";
import { LanguageSwitcher } from "@/components/header/LanguageSwitcher";

interface Props {
  avatarUrl?: string | null;
  nickname?: string | null;
  isAdmin?: boolean;
}

export async function Header({ avatarUrl, nickname, isAdmin }: Props) {
  const t = await getTranslations("header");

  const navLinks = [
    { label: t("home"), href: "/home" },
    { label: t("standings"), href: "/standings" },
    { label: t("fixture"), href: "/fixture" },
    { label: t("matches"), href: "/matches" },
    { label: t("predictions"), href: "/predictions" },
    { label: t("activity"), href: "/activity" },
    { label: t("arena"), href: "/prediction-arena" },
    { label: t("rules"), href: "/rules" },
  ];

  const links = isAdmin
    ? [...navLinks, { label: t("admin"), href: "/admin" }]
    : navLinks;

  return (
    <header
      className="flex items-center justify-between h-[68px] px-4 lg:px-8"
      style={{
        background: "var(--color-bg-header)",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      {/* Left: Logo */}
      <Link href="/home" className="flex items-center">
        <Logo />
      </Link>

      {/* Center: Nav (hidden on mobile) */}
      <nav className="hidden lg:flex items-center gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13px] font-bold transition-colors hover:opacity-80"
            style={{
              color: "var(--color-accent-silver)",
              fontFamily: "var(--font-display)",
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right: Language + Profile + Mobile nav toggle */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex">
          <LanguageSwitcher />
        </div>
        <ProfileMenu avatarUrl={avatarUrl ?? null} nickname={nickname ?? null} />
        <MobileNav links={links} />
      </div>
    </header>
  );
}
