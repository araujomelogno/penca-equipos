import { Resend } from "resend";
import { logger } from "@/lib/logger";

let resend: Resend;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const OTP_STRINGS = {
  en: {
    subject: "Your Pencachi login code",
    intro: "Your one-time login code is:",
    expiry: "This code expires in 10 minutes.",
  },
  es: {
    subject: "Tu código de acceso a Pencachi",
    intro: "Tu código de acceso único es:",
    expiry: "Este código expira en 10 minutos.",
  },
} as const;

export async function sendOtpEmail(to: string, code: string, locale: string = "en") {
  const from = process.env.RESEND_FROM || "Pencachi <onboarding@resend.dev>";
  const strings = OTP_STRINGS[locale === "es" ? "es" : "en"];

  const { error } = await getResend().emails.send({
    from,
    to,
    subject: strings.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; text-align: center;">
        <h2 style="color: #1a1a2e;">Pencachi</h2>
        <p>${strings.intro}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e9c46a; margin: 24px 0;">
          ${code}
        </p>
        <p style="color: #666; font-size: 13px;">${strings.expiry}</p>
      </div>
    `,
  });

  if (error) {
    logger.error({ err: error, to }, "Failed to send email");
    throw new Error("Failed to send email");
  }
}
