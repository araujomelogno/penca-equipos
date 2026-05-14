"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import AuthCard from "@/components/ui/AuthCard";
import FormInput from "@/components/ui/FormInput";
import GoldButton from "@/components/ui/GoldButton";

function PasswordLogin() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("invalid"));
    } else {
      router.push("/home");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-5">
        <FormInput
          id="login-email"
          label={t("email")}
          icon="mail"
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={setEmail}
        />
        <FormInput
          id="login-password"
          label={t("password")}
          icon="lock"
          type="password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={setPassword}
        />

        {error && (
          <p className="text-sm text-center" style={{ color: "var(--color-accent-red)" }}>
            {error}
          </p>
        )}

        <GoldButton loading={loading}>{t("submit")}</GoldButton>
      </div>
    </form>
  );
}

function OtpLogin() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tOtp = useTranslations("auth.login.otp");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? tOtp("sendFailed"));
        return;
      }

      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? tOtp("verifyFailed"));
        return;
      }

      router.push("/home");
    } finally {
      setLoading(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={handleRequestOtp}>
        <div className="flex flex-col gap-5">
          <FormInput
            id="otp-email"
            label={t("email")}
            icon="mail"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={setEmail}
          />

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--color-accent-red)" }}>
              {error}
            </p>
          )}

          <GoldButton loading={loading}>{tOtp("sendCode")}</GoldButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp}>
      <div className="flex flex-col gap-5">
        <p
          className="text-center"
          style={{
            margin: 0,
            fontSize: 13,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-secondary)",
          }}
        >
          {tOtp("sentMessage")} <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong>
        </p>

        <FormInput
          id="otp-code"
          label={tOtp("code")}
          icon="pin"
          type="text"
          placeholder={tOtp("codePlaceholder")}
          value={code}
          onChange={setCode}
        />

        {error && (
          <p className="text-sm text-center" style={{ color: "var(--color-accent-red)" }}>
            {error}
          </p>
        )}

        <GoldButton loading={loading}>{tOtp("verify")}</GoldButton>

        <button
          type="button"
          onClick={() => { setStep("email"); setCode(""); setError(""); }}
          className="border-none bg-transparent cursor-pointer text-center"
          style={{
            fontSize: 12,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-secondary)",
          }}
        >
          {tOtp("differentEmail")}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const [mode, setMode] = useState<"password" | "otp">("password");

  return (
    <AuthCard>
      {/* Toggle */}
      <div
        className="flex"
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <button
          type="button"
          onClick={() => setMode("password")}
          className="border-none cursor-pointer flex-1"
          style={{
            padding: "10px 0",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: 1.5,
            color: mode === "password" ? "var(--color-text-accent-dark)" : "var(--color-text-secondary)",
            background: mode === "password"
              ? "linear-gradient(135deg, #ffe19e, #e9c46a)"
              : "transparent",
            transition: "all 0.2s",
          }}
        >
          {t("togglePassword")}
        </button>
        <button
          type="button"
          onClick={() => setMode("otp")}
          className="border-none cursor-pointer flex-1"
          style={{
            padding: "10px 0",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: 1.5,
            color: mode === "otp" ? "var(--color-text-accent-dark)" : "var(--color-text-secondary)",
            background: mode === "otp"
              ? "linear-gradient(135deg, #ffe19e, #e9c46a)"
              : "transparent",
            transition: "all 0.2s",
          }}
        >
          {t("toggleOtp")}
        </button>
      </div>

      {mode === "password" ? <PasswordLogin /> : <OtpLogin />}

      <div
        className="flex items-center justify-center gap-1 text-[13px]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <span style={{ color: "var(--color-text-secondary)" }}>
          {t("noAccount")}
        </span>
        <Link
          href="/register"
          className="font-bold"
          style={{ color: "var(--color-text-accent)" }}
        >
          {t("signUp")}
        </Link>
      </div>
    </AuthCard>
  );
}
