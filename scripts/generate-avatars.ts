/**
 * Generates 12 octopus avatar SVGs with different colors and expressions.
 * Run: npx tsx scripts/generate-avatars.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";

interface OctopusConfig {
  name: string;
  body: string;       // main body color
  bodyDark: string;   // darker shade for tentacles
  spots: string;      // spots/accent color
  eyeBg: string;      // eye background
  pupil: string;      // pupil color
  mouth: "smile" | "open" | "tongue" | "smirk" | "surprised" | "happy";
  hat?: { type: "crown" | "pirate" | "wizard" | "headband" | "chef" | "party"; color: string };
  accessory?: { type: "glasses" | "bowtie" | "scarf" | "earring"; color: string };
  spots_on?: boolean;
  blush?: boolean;
}

const octopuses: OctopusConfig[] = [
  // 1. Golden (matches logo)
  {
    name: "octopus-gold",
    body: "#e9c46a", bodyDark: "#d4a843", spots: "#f5d78e",
    eyeBg: "#fff", pupil: "#2a1f0a",
    mouth: "smile", spots_on: true,
  },
  // 2. Ocean blue
  {
    name: "octopus-blue",
    body: "#4a90d9", bodyDark: "#3570b0", spots: "#7ab5f0",
    eyeBg: "#fff", pupil: "#1a2a4a",
    mouth: "happy", blush: true,
  },
  // 3. Coral/pink
  {
    name: "octopus-coral",
    body: "#f08080", bodyDark: "#d06060", spots: "#ffaaaa",
    eyeBg: "#fff", pupil: "#4a1a2a",
    mouth: "tongue", blush: true,
  },
  // 4. Purple wizard
  {
    name: "octopus-purple",
    body: "#9b6dff", bodyDark: "#7b4ddf", spots: "#c49fff",
    eyeBg: "#fff", pupil: "#2a1a4a",
    mouth: "smirk",
    hat: { type: "wizard", color: "#6b3daf" },
  },
  // 5. Green
  {
    name: "octopus-green",
    body: "#5cb85c", bodyDark: "#3c983c", spots: "#8cd88c",
    eyeBg: "#fff", pupil: "#1a3a1a",
    mouth: "smile", spots_on: true,
  },
  // 6. Red pirate
  {
    name: "octopus-red",
    body: "#e74c3c", bodyDark: "#c0392b", spots: "#ff7b6b",
    eyeBg: "#fff", pupil: "#3a0a0a",
    mouth: "smirk",
    hat: { type: "pirate", color: "#2c3e50" },
  },
  // 7. Teal with glasses
  {
    name: "octopus-teal",
    body: "#2dd4bf", bodyDark: "#14b8a6", spots: "#5eead4",
    eyeBg: "#fff", pupil: "#0a2a2a",
    mouth: "smile",
    accessory: { type: "glasses", color: "#334155" },
  },
  // 8. Orange
  {
    name: "octopus-orange",
    body: "#f59e0b", bodyDark: "#d97706", spots: "#fbbf24",
    eyeBg: "#fff", pupil: "#3a2a0a",
    mouth: "open", spots_on: true,
  },
  // 9. Pink with crown
  {
    name: "octopus-pink",
    body: "#ec4899", bodyDark: "#db2777", spots: "#f9a8d4",
    eyeBg: "#fff", pupil: "#4a0a2a",
    mouth: "happy",
    hat: { type: "crown", color: "#eab308" },
  },
  // 10. Navy with bowtie
  {
    name: "octopus-navy",
    body: "#6366f1", bodyDark: "#4f46e5", spots: "#a5b4fc",
    eyeBg: "#fff", pupil: "#1e1b4b",
    mouth: "smile",
    accessory: { type: "bowtie", color: "#ef4444" },
  },
  // 11. Mint surprised
  {
    name: "octopus-mint",
    body: "#6ee7b7", bodyDark: "#34d399", spots: "#a7f3d0",
    eyeBg: "#fff", pupil: "#064e3b",
    mouth: "surprised", blush: true,
  },
  // 12. Lavender chef
  {
    name: "octopus-lavender",
    body: "#c4b5fd", bodyDark: "#a78bfa", spots: "#ddd6fe",
    eyeBg: "#fff", pupil: "#2e1065",
    mouth: "happy",
    hat: { type: "chef", color: "#fff" },
  },
];

function getMouth(type: string, cx: number, cy: number): string {
  switch (type) {
    case "smile":
      return `<path d="M${cx - 5} ${cy} Q${cx} ${cy + 6} ${cx + 5} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    case "happy":
      return `<path d="M${cx - 6} ${cy - 1} Q${cx} ${cy + 7} ${cx + 6} ${cy - 1}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    case "open":
      return `<ellipse cx="${cx}" cy="${cy + 2}" rx="4" ry="3.5" fill="#333"/><ellipse cx="${cx}" cy="${cy + 1.5}" rx="2.5" ry="2" fill="#ff6b6b"/>`;
    case "tongue":
      return `<path d="M${cx - 5} ${cy} Q${cx} ${cy + 6} ${cx + 5} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="${cx}" cy="${cy + 5}" rx="2.5" ry="3" fill="#ff6b8a"/>`;
    case "smirk":
      return `<path d="M${cx - 4} ${cy + 1} Q${cx + 2} ${cy + 5} ${cx + 6} ${cy - 1}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    case "surprised":
      return `<ellipse cx="${cx}" cy="${cy + 2}" rx="3.5" ry="4" fill="#333"/><ellipse cx="${cx}" cy="${cy + 1}" rx="2" ry="2" fill="#ff9999"/>`;
    default:
      return `<path d="M${cx - 5} ${cy} Q${cx} ${cy + 6} ${cx + 5} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  }
}

function getHat(type: string, color: string): string {
  switch (type) {
    case "crown":
      return `<path d="M22 18 L20 10 L26 14 L32 8 L38 14 L44 10 L42 18 Z" fill="${color}" stroke="#d97706" stroke-width="0.8"/>
              <circle cx="26" cy="13" r="1.2" fill="#ef4444"/>
              <circle cx="32" cy="9.5" r="1.2" fill="#3b82f6"/>
              <circle cx="38" cy="13" r="1.2" fill="#22c55e"/>`;
    case "pirate":
      return `<path d="M20 22 Q32 14 44 22" fill="${color}" stroke="#1a1a2e" stroke-width="0.5"/>
              <path d="M18 22 L46 22" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M28 18 L30 15 L36 15 L34 18" fill="#fff" stroke="#1a1a2e" stroke-width="0.5"/>
              <path d="M30 15 L33 12 L36 15" fill="none" stroke="#1a1a2e" stroke-width="0.5"/>`;
    case "wizard":
      return `<path d="M24 22 L32 2 L40 22 Z" fill="${color}" stroke="#4c1d95" stroke-width="0.8"/>
              <circle cx="32" cy="5" r="2" fill="#fbbf24"/>
              <path d="M27 14 L29 12 L31 15 L33 11 L35 14 L37 12" stroke="#fbbf24" stroke-width="0.8" fill="none"/>
              <path d="M22 22 L42 22" stroke="${color}" stroke-width="2"/>`;
    case "chef":
      return `<ellipse cx="32" cy="16" rx="11" ry="5" fill="${color}" stroke="#e5e7eb" stroke-width="0.5"/>
              <circle cx="28" cy="13" r="4" fill="${color}" stroke="#e5e7eb" stroke-width="0.3"/>
              <circle cx="36" cy="13" r="4" fill="${color}" stroke="#e5e7eb" stroke-width="0.3"/>
              <circle cx="32" cy="11" r="4.5" fill="${color}" stroke="#e5e7eb" stroke-width="0.3"/>
              <rect x="22" y="19" width="20" height="3" rx="1" fill="${color}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    case "party":
      return `<path d="M26 22 L32 6 L38 22" fill="${color}" stroke="#d946ef" stroke-width="0.5"/>
              <circle cx="32" cy="6" r="2" fill="#fbbf24"/>
              <path d="M30 18 L32 14 L34 18" fill="#22d3ee" stroke="none"/>`;
    case "headband":
      return `<path d="M20 24 Q32 20 44 24" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

function getAccessory(type: string, color: string): string {
  switch (type) {
    case "glasses":
      return `<circle cx="27" cy="32" r="5.5" fill="none" stroke="${color}" stroke-width="1.8"/>
              <circle cx="37" cy="32" r="5.5" fill="none" stroke="${color}" stroke-width="1.8"/>
              <path d="M32.5 32 L31.5 32" stroke="${color}" stroke-width="1.8"/>
              <path d="M21.5 31 L18 29" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/>
              <path d="M42.5 31 L46 29" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/>`;
    case "bowtie":
      return `<path d="M26 44 L32 47 L38 44 L32 41 Z" fill="${color}" stroke="#b91c1c" stroke-width="0.5"/>
              <circle cx="32" cy="44" r="1.5" fill="#fbbf24"/>`;
    case "scarf":
      return `<path d="M20 42 Q32 46 44 42" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M34 43 L36 50 L32 48 L34 43" fill="${color}"/>`;
    case "earring":
      return `<circle cx="19" cy="34" r="2" fill="${color}" stroke="#d4a843" stroke-width="0.5"/>`;
    default:
      return "";
  }
}

function generateOctopusSvg(config: OctopusConfig): string {
  const { body, bodyDark, spots, eyeBg, pupil, spots_on, blush } = config;

  // Tentacle paths — 6 tentacles curving outward
  const tentacles = `
    <path d="M18 42 Q12 50 10 56 Q9 60 13 58 Q16 56 18 50 Q19 47 20 44" fill="${bodyDark}" stroke="${body}" stroke-width="0.5"/>
    <path d="M22 44 Q18 53 16 59 Q15 63 19 61 Q22 59 23 52 Q24 48 24 45" fill="${bodyDark}" stroke="${body}" stroke-width="0.5"/>
    <path d="M28 45 Q27 55 26 61 Q25.5 65 29 63 Q31 61 31 54 Q31 50 30 46" fill="${bodyDark}" stroke="${body}" stroke-width="0.5"/>
    <path d="M36 45 Q37 55 38 61 Q38.5 65 35 63 Q33 61 33 54 Q33 50 34 46" fill="${bodyDark}" stroke="${body}" stroke-width="0.5"/>
    <path d="M40 44 Q44 53 46 59 Q47 63 43 61 Q40 59 39 52 Q38 48 38 45" fill="${bodyDark}" stroke="${body}" stroke-width="0.5"/>
    <path d="M44 42 Q50 50 52 56 Q53 60 49 58 Q46 56 44 50 Q43 47 42 44" fill="${bodyDark}" stroke="${body}" stroke-width="0.5"/>
  `;

  // Spots on head
  const spotsMarkup = spots_on ? `
    <circle cx="26" cy="24" r="2" fill="${spots}" opacity="0.5"/>
    <circle cx="38" cy="22" r="1.5" fill="${spots}" opacity="0.5"/>
    <circle cx="33" cy="20" r="1.8" fill="${spots}" opacity="0.4"/>
    <circle cx="28" cy="28" r="1.2" fill="${spots}" opacity="0.4"/>
  ` : "";

  // Blush marks
  const blushMarkup = blush ? `
    <ellipse cx="22" cy="36" rx="3" ry="1.5" fill="#ff9999" opacity="0.3"/>
    <ellipse cx="42" cy="36" rx="3" ry="1.5" fill="#ff9999" opacity="0.3"/>
  ` : "";

  // Eyes
  const eyes = `
    <ellipse cx="27" cy="32" rx="4.5" ry="5" fill="${eyeBg}"/>
    <ellipse cx="37" cy="32" rx="4.5" ry="5" fill="${eyeBg}"/>
    <ellipse cx="28" cy="31.5" rx="2.8" ry="3.2" fill="${pupil}"/>
    <ellipse cx="38" cy="31.5" rx="2.8" ry="3.2" fill="${pupil}"/>
    <ellipse cx="29" cy="30.5" rx="1" ry="1.2" fill="#fff"/>
    <ellipse cx="39" cy="30.5" rx="1" ry="1.2" fill="#fff"/>
  `;

  const mouth = getMouth(config.mouth, 32, 38);
  const hat = config.hat ? getHat(config.hat.type, config.hat.color) : "";
  const accessory = config.accessory ? getAccessory(config.accessory.type, config.accessory.color) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 68" width="128" height="136">
  <rect width="64" height="68" rx="12" fill="${body}22"/>
  ${tentacles}
  <ellipse cx="32" cy="30" rx="17" ry="15" fill="${body}"/>
  ${spotsMarkup}
  ${eyes}
  ${blushMarkup}
  ${mouth}
  ${hat}
  ${accessory}
</svg>`;
}

// Generate all 12 avatars
const outDir = join(process.cwd(), "public", "avatars");

for (const config of octopuses) {
  const svg = generateOctopusSvg(config);
  const filePath = join(outDir, `${config.name}.svg`);
  writeFileSync(filePath, svg);
  console.log(`✓ ${config.name}.svg`);
}

console.log(`\nDone! Generated ${octopuses.length} avatars in public/avatars/`);
