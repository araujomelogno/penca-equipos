# R32 Curated Bilingual Match Analysis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale templated R32 "AI" analysis with hand-authored bilingual prose (ES rioplatense / EN tactical), stored per-locale and surfaced by active locale.

**Architecture:** Two new nullable scalar columns on `Match` (`analysisEs`, `analysisEn`) hold curated text. A manual re-runnable seed script writes them from a static map keyed by `homeCode-awayCode`. The `AIAnalysis` server component picks the right text by `getLocale()` with a fallback chain (locale → legacy `analysis` → i18n default), via a pure `pickAnalysis()` helper.

**Tech Stack:** Next.js (custom build — consult `node_modules/next/dist/docs/` before runtime code), Prisma 7 + `@prisma/adapter-pg`, next-intl, Vitest, TypeScript.

## Global Constraints

- Branch: `feat/r32-curated-analysis` (never `master`). Already created.
- Spec: `docs/superpowers/specs/2026-06-28-r32-curated-analysis-design.md`.
- One bash command per call; never chain with `&&`/`||`/`;`.
- No `console.log` in app code (use `src/lib/logger.ts`); seed scripts may use `console.log` (existing convention).
- Unit tests are definition-of-done. `npx tsc --noEmit` + eslint + full vitest suite must be green.
- New UI copy goes in BOTH `messages/en.json` and `messages/es.json`.
- No hex colors in `.tsx` (ESLint guard) — not relevant here, no new styles.
- The 16 R32 pairings (DB home-away order, pulled 2026-06-28):
  `RSA-CAN, BRA-JPN, GER-PAR, NED-MAR, CIV-NOR, FRA-SWE, MEX-ECU, ENG-COD, BEL-SEN, USA-BIH, ESP-AUT, POR-CRO, SUI-ALG, AUS-EGY, ARG-CPV, COL-GHA`.

## File Structure

- `prisma/schema.prisma` — add two columns to `Match`.
- `prisma/migrations/<ts>_add_match_analysis_i18n/migration.sql` — hand-authored ALTER (local DB is offline; mirrors existing manual style).
- `src/lib/match-analysis.ts` — NEW. Pure `pickAnalysis()` helper. One responsibility: locale selection + fallback.
- `src/lib/match-analysis.test.ts` — NEW. Unit tests for `pickAnalysis()`.
- `scripts/r32-analysis-content.ts` — NEW. The curated bilingual map (data only, importable so tests can assert completeness without a DB).
- `scripts/r32-analysis-content.test.ts` — NEW. Completeness test of the map.
- `scripts/seed-r32-analysis.ts` — NEW. Re-runnable seed script (dotenv + PrismaPg, dry-run/--write).
- `src/lib/queries/matchDetail.ts` — add `analysisEs`/`analysisEn` to select + `MatchDetailData.match` type.
- `src/components/match-detail/AIAnalysis.tsx` — accept both texts, call `getLocale()`, use `pickAnalysis()`.
- `src/app/(main)/matches/[matchId]/page.tsx` — pass new props at both render sites.
- `messages/en.json`, `messages/es.json` — honest `analysis.source` label.

---

### Task 1: Data model — add `analysisEs` / `analysisEn` columns

**Files:**
- Modify: `prisma/schema.prisma` (the `Match` model, near `analysis String?`)
- Create: `prisma/migrations/20260628120000_add_match_analysis_i18n/migration.sql`

**Interfaces:**
- Produces: `Match.analysisEs: string | null`, `Match.analysisEn: string | null` (Prisma client fields).

- [ ] **Step 1: Add the columns to the schema**

In `prisma/schema.prisma`, find:

```prisma
  analysis      String?
  lastSyncedAt  DateTime?
```

Replace with:

```prisma
  analysis      String?
  analysisEs    String?
  analysisEn    String?
  lastSyncedAt  DateTime?
```

- [ ] **Step 2: Hand-author the migration SQL**

Create `prisma/migrations/20260628120000_add_match_analysis_i18n/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "analysisEs" TEXT,
ADD COLUMN     "analysisEn" TEXT;
```

- [ ] **Step 3: Regenerate the Prisma client** (no DB needed — reads schema only)

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success message.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no usages yet; client now knows the fields).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260628120000_add_match_analysis_i18n/migration.sql src/generated/prisma
git commit -m "feat(db): add analysisEs/analysisEn columns to Match"
```

---

### Task 2: `pickAnalysis()` pure helper (TDD)

**Files:**
- Create: `src/lib/match-analysis.ts`
- Test: `src/lib/match-analysis.test.ts`

**Interfaces:**
- Produces: `pickAnalysis(locale: string, texts: { es: string | null; en: string | null }, legacy: string | null, fallback: string): string`
  - Returns `texts.es` when `locale` starts with `"es"` and it's non-empty.
  - Returns `texts.en` when `locale` starts with `"en"` and it's non-empty.
  - For any locale, if the locale-specific text is empty/null, falls back to `legacy` (if non-empty), then `fallback`.
  - Unknown locale → treat like `en` (default app behavior), then same fallback chain.

- [ ] **Step 1: Write the failing test**

Create `src/lib/match-analysis.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickAnalysis } from "./match-analysis";

const FALLBACK = "default text";

describe("pickAnalysis", () => {
  it("returns the Spanish text for an es locale", () => {
    expect(
      pickAnalysis("es", { es: "hola", en: "hi" }, "legacy", FALLBACK),
    ).toBe("hola");
  });

  it("returns the English text for an en locale", () => {
    expect(
      pickAnalysis("en", { es: "hola", en: "hi" }, "legacy", FALLBACK),
    ).toBe("hi");
  });

  it("handles region-suffixed locales like es-UY / en-US", () => {
    expect(pickAnalysis("es-UY", { es: "hola", en: "hi" }, null, FALLBACK)).toBe("hola");
    expect(pickAnalysis("en-US", { es: "hola", en: "hi" }, null, FALLBACK)).toBe("hi");
  });

  it("falls back to legacy when the locale text is null", () => {
    expect(
      pickAnalysis("es", { es: null, en: "hi" }, "legacy", FALLBACK),
    ).toBe("legacy");
  });

  it("falls back to legacy when the locale text is empty/whitespace", () => {
    expect(
      pickAnalysis("es", { es: "   ", en: "hi" }, "legacy", FALLBACK),
    ).toBe("legacy");
  });

  it("falls back to the default when both locale text and legacy are missing", () => {
    expect(
      pickAnalysis("en", { es: null, en: null }, null, FALLBACK),
    ).toBe(FALLBACK);
  });

  it("treats an unknown locale as English", () => {
    expect(
      pickAnalysis("fr", { es: "hola", en: "hi" }, "legacy", FALLBACK),
    ).toBe("hi");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/match-analysis.test.ts`
Expected: FAIL — cannot find module `./match-analysis` / `pickAnalysis is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/match-analysis.ts`:

```ts
/**
 * Selects the match-analysis prose to display for the active locale.
 *
 * Fallback chain: locale-specific curated text → legacy single-language
 * `analysis` column → i18n default string. A whitespace-only string counts as
 * absent so a half-seeded row never renders blank.
 */
function firstNonEmpty(...values: (string | null | undefined)[]): string | null {
  for (const v of values) {
    if (v && v.trim().length > 0) return v;
  }
  return null;
}

export function pickAnalysis(
  locale: string,
  texts: { es: string | null; en: string | null },
  legacy: string | null,
  fallback: string,
): string {
  const localeText = locale.toLowerCase().startsWith("es") ? texts.es : texts.en;
  return firstNonEmpty(localeText, legacy) ?? fallback;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/match-analysis.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-analysis.ts src/lib/match-analysis.test.ts
git commit -m "feat: pickAnalysis locale selection helper"
```

---

### Task 3: Curated content map + completeness test

**Files:**
- Create: `scripts/r32-analysis-content.ts`
- Test: `scripts/r32-analysis-content.test.ts`

**Interfaces:**
- Produces: `R32_ANALYSIS: Record<string, { es: string; en: string }>` keyed by `"${homeCode}-${awayCode}"`.
- Produces: `R32_PAIRS: string[]` — the 16 expected keys (single source of truth for the completeness test and the seed's loud-fail check).

- [ ] **Step 1: Write the failing completeness test**

Create `scripts/r32-analysis-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { R32_ANALYSIS, R32_PAIRS } from "./r32-analysis-content";

describe("R32 curated analysis content", () => {
  it("lists exactly the 16 known R32 pairings", () => {
    expect(R32_PAIRS).toHaveLength(16);
    expect(new Set(R32_PAIRS).size).toBe(16);
  });

  it("has an entry for every R32 pair", () => {
    for (const pair of R32_PAIRS) {
      expect(R32_ANALYSIS[pair], `missing entry for ${pair}`).toBeDefined();
    }
  });

  it("has no entries that are not real R32 pairs", () => {
    const known = new Set(R32_PAIRS);
    for (const key of Object.keys(R32_ANALYSIS)) {
      expect(known.has(key), `unexpected entry ${key}`).toBe(true);
    }
  });

  it("has non-empty es and en text for every entry", () => {
    for (const [pair, t] of Object.entries(R32_ANALYSIS)) {
      expect(t.es.trim().length, `empty es for ${pair}`).toBeGreaterThan(20);
      expect(t.en.trim().length, `empty en for ${pair}`).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/r32-analysis-content.test.ts`
Expected: FAIL — cannot find module `./r32-analysis-content`.

- [ ] **Step 3: Write the content module**

Create `scripts/r32-analysis-content.ts`:

```ts
/**
 * Hand-authored R32 match analysis, two voices:
 *   es → relator rioplatense con humor
 *   en → tactical analyst with spark
 * Keyed by "${homeCode}-${awayCode}" in DB home-away order.
 * Pulled from prod fixtures on 2026-06-28; if a tie changes, rewrite that entry.
 */
export const R32_PAIRS = [
  "RSA-CAN", "BRA-JPN", "GER-PAR", "NED-MAR",
  "CIV-NOR", "FRA-SWE", "MEX-ECU", "ENG-COD",
  "BEL-SEN", "USA-BIH", "ESP-AUT", "POR-CRO",
  "SUI-ALG", "AUS-EGY", "ARG-CPV", "COL-GHA",
] as const;

export const R32_ANALYSIS: Record<string, { es: string; en: string }> = {
  "RSA-CAN": {
    es: "Sudáfrica y Canadá se cruzan en el partido que nadie tenía en la quiniela. Los Bafana Bafana vuelven a un Mundial con ganas de dar el golpe, pero Canadá juega en casa y con el envión del anfitrión. Cierre parejo, de esos que se definen por un pelotazo y un arquero inspirado: poné el mate al fuego que esto va para largo.",
    en: "South Africa against Canada is the tie the bracket-fillers quietly skipped. The Bafana Bafana arrive hungry for a statement, but Canada have home soil and host-nation momentum on their side. Expect a cagey, low-block affair decided by a single set piece or a goalkeeping howler — fine margins all the way.",
  },
  "BRA-JPN": {
    es: "Brasil contra Japón es choque de estilos: el jogo bonito frente a la prolijidad samurái que ya hizo sufrir a más de un grande. El Scratch parte de favorito y con galería para regalar, pero Japón no vino de paseo y presiona como reloj suizo. Si los nipones aguantan los primeros veinte minutos, capaz nos comemos un susto de los lindos.",
    en: "Brazil versus Japan is a clash of identities: jogo bonito against the disciplined Samurai Blue who have troubled bigger names before. The Seleção start as favorites with flair to spare, but Japan press like clockwork and won't sit back politely. If the Japanese survive the opening twenty minutes, an upset is firmly on the table.",
  },
  "GER-PAR": {
    es: "Alemania llega con su renovación táctica a cuestas y Paraguay con el cuchillo entre los dientes, fiel a la escuela guaraní de sufrir y contragolpear. Los teutones tienen el reloj y la eficiencia, pero a la Albirroja le encanta arruinarle la fiesta a los candidatos. Partido de paciencia: el que se desespere primero, paga.",
    en: "Germany bring their tactical reboot; Paraguay bring a knife between the teeth and that classic knack for defending deep and stinging on the break. The Germans have the rhythm and the efficiency, but the Albirroja love nothing more than spoiling a favorite's party. A test of patience — whoever blinks first picks up the bill.",
  },
  "NED-MAR": {
    es: "Países Bajos contra Marruecos huele a revancha del 2022, cuando los africanos pusieron a media humanidad a creer. La Naranja Mecánica tiene fútbol total y flexibilidad, pero Marruecos defiende con alma y te liquida a la contra. Si los Leones del Atlas repiten aquella versión, los holandeses van a sudar la naranja.",
    en: "Netherlands against Morocco carries the scent of 2022, when the Atlas Lions made half the planet believe. The Dutch offer total football and tactical flexibility, but Morocco defend with their souls and punish you on the counter. If they channel that World Cup run again, the Oranje will be made to sweat for every inch.",
  },
  "CIV-NOR": {
    es: "Costa de Marfil, campeona de África, contra una Noruega que tiene en su delantero a una máquina de hacer goles. Choque de potencia africana versus pegada escandinava: si a los marfileños les funciona la pierna, hay fiesta; si Noruega le da tres pelotas claras a su killer, hay drama. Imperdible para los amantes del gol.",
    en: "Reigning African champions Ivory Coast face a Norway side built around one of the planet's deadliest finishers. It's African power against Scandinavian punch: if the Ivorians find their rhythm, it's a party; if Norway feed their striker even three clear looks, it's trouble. One for the goal lovers.",
  },
  "FRA-SWE": {
    es: "Francia es Francia: un plantel que da miedo de lo profundo que es. Suecia llegó peleando desde el repechaje y va a plantarse física y ordenada, pero la diferencia de jerarquía está a la vista. Los bleus deberían pasar de largo… salvo que se relajen y los nórdicos les hagan acordar que esto es Mundial.",
    en: "France are France — a squad so deep it's almost unfair. Sweden battled through the playoffs and will set up physical and organized, but the gulf in quality is plain to see. Les Bleus should cruise… unless complacency creeps in and the Scandinavians remind them this is a World Cup.",
  },
  "MEX-ECU": {
    es: "México, anfitrión, carga con la maldición de los octavos y la presión de todo un país encima. Ecuador es joven, rápido y físico, justo el tipo de rival incómodo que históricamente le da pesadillas al Tri. Con el Azteca empujando, el local tiene con qué; pero si los ecuatorianos corren como saben, la maldición sigue rondando.",
    en: "Mexico, the co-hosts, carry both their Round-of-16 curse and the weight of an entire nation. Ecuador are young, quick and physical — exactly the awkward kind of opponent that has historically given El Tri nightmares. With the Azteca roaring, the hosts have enough; but if Ecuador run like they can, that old curse keeps circling.",
  },
  "ENG-COD": {
    es: "Inglaterra desembarca con su catálogo de cracks de la Premier y la mochila eterna de 'esta es la nuestra'. La RD Congo es pura potencia y atletismo, y viene de un repechaje intercontinental con ganas de morder. Los ingleses son amplios favoritos, pero si se ponen nerviosos —y suelen— los congoleños tienen físico para incomodarlos.",
    en: "England arrive with their Premier League catalogue of stars and the familiar weight of 'this is finally our year.' DR Congo are all power and athleticism, fresh off an intercontinental playoff and itching to bite. The Three Lions are heavy favorites, but if the nerves show — and they tend to — Congo have the physicality to make it uncomfortable.",
  },
  "BEL-SEN": {
    es: "Bélgica todavía tiene nombres, aunque la generación dorada ya peina canas. Senegal es de lo mejor de África: experiencia europea, atletismo y un equipo al que no le tiembla el pulso ante nadie. Partidazo de los que pueden ir a penales: si los Diablos Rojos no arrancan finos, los Leones de Teranga se los comen.",
    en: "Belgium still boast big names, even as their golden generation greys at the temples. Senegal are among Africa's finest — European pedigree, athleticism, and a side that fears no one. This has penalty-shootout written all over it: if the Red Devils start sloppily, the Lions of Teranga will pounce.",
  },
  "USA-BIH": {
    es: "Estados Unidos juega en casa, con un equipo joven y ambicioso y toda la grada de su lado. Bosnia llega picante tras dejar a Italia en el camino del repechaje y tiene calidad en el medio para complicar a cualquiera. El local manda en el papel y en la tribuna, pero los bosnios vinieron a aguarle la fiesta al anfitrión.",
    en: "The United States play at home with a young, ambitious side and the whole crowd behind them. Bosnia arrive dangerous after knocking Italy out in the playoffs, with the midfield quality to trouble anyone. The hosts hold the edge on paper and in the stands — but the Bosnians came to crash the party.",
  },
  "ESP-AUT": {
    es: "España, campeona de Europa, trae su tiqui-taca y uno de los planteles más profundos del torneo. Austria no es la cenicienta de antes: presiona alto, juega ordenada y se hizo respetar. La Roja es favorita clara, pero si los austríacos le cortan los circuitos de pase, el partido se le puede hacer cuesta arriba.",
    en: "Spain, the European champions, bring their tiki-taka and one of the deepest squads in the tournament. Austria are no longer the pushovers of old: they press high, stay organized and have earned their respect. La Roja are clear favorites, but if the Austrians choke off the passing lanes, this could turn into a slog.",
  },
  "POR-CRO": {
    es: "Portugal mezcla veteranos con galones y una camada nueva que mete miedo. Croacia es Croacia en los mandos: ese mediocampo que te marea y que en los partidos grandes nunca afloja. Duelo de jerarquía pura, de los que se definen por un detalle o por quién aguanta mejor los nervios cuando el reloj aprieta.",
    en: "Portugal blend decorated veterans with a thrilling new wave of talent. Croatia are, well, Croatia in midfield — that dizzying engine room that never wilts on the big stage. A heavyweight duel likely settled by a single detail, or by whoever keeps their nerve when the clock starts to bite.",
  },
  "SUI-ALG": {
    es: "Suiza es esa máquina ordenada y aburrida —en el buen sentido— que te elimina sin que te des cuenta. Argelia tiene gambeta, velocidad y técnica para romper cualquier libreto. Si los suizos imponen su orden, pasan tranquilos; si los argelinos se sueltan, le pueden arruinar el plan a los helvéticos en un pestañeo.",
    en: "Switzerland are that tidy, boringly efficient machine — in the best sense — that knocks you out before you notice. Algeria carry the dribbling, pace and technique to tear up any script. If the Swiss impose their order, they advance comfortably; if Algeria cut loose, they can wreck the plan in the blink of an eye.",
  },
  "AUS-EGY": {
    es: "Australia pone garra, físico y esa experiencia mundialista de los Socceroos que nunca regalan nada. Egipto es historia grande del fútbol africano y trae una hinchada que se hace sentir hasta por la tele. Partido trabado, de fricción y poco lujo: el que meta primero va a defender ese gol como si fuera el último tesoro.",
    en: "Australia bring grit, muscle and that Socceroos tournament savvy that never gives an inch. Egypt are African football royalty with a fanbase you can feel through the screen. Expect a scrappy, physical, low-frills affair — whoever scores first will guard that lead like buried treasure.",
  },
  "ARG-CPV": {
    es: "Argentina, campeona del mundo y con una generación dorada, contra Cabo Verde, la Cenicienta que llegó a su primer Mundial y ya hizo historia. En los papeles es palo y palo para la Albiceleste, pero los caboverdianos vinieron a disfrutar y a jugarle de igual a igual a quien sea. Que no se relajen los de Scaloni… o capaz el cuento de hadas sigue.",
    en: "World champions Argentina and their golden generation take on Cape Verde, the fairy-tale debutants who have already made history just by arriving. On paper it's all Albiceleste, but the Cape Verdeans came to enjoy the ride and trade blows with anyone. Scaloni's men had better not switch off — or the fairy tale just might roll on.",
  },
  "COL-GHA": {
    es: "Colombia es pura gambeta, ritmo y creatividad, de esos equipos que cuando se prenden son una fiesta. Ghana trae a las Estrellas Negras con su flair africano y esa actitud de no rendirse jamás. Choque vistoso y de ida y vuelta: si los cafeteros pisan el acelerador hay baile, pero los ghaneses no se asustan ni con la pólvora mojada.",
    en: "Colombia are all dribbling, rhythm and creativity — the kind of team that becomes a carnival once they click. Ghana bring the Black Stars' African flair and a never-say-die streak. A vibrant, end-to-end clash: if the Cafeteros hit top gear it's a show, but Ghana don't scare easily.",
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/r32-analysis-content.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/r32-analysis-content.ts scripts/r32-analysis-content.test.ts
git commit -m "feat: curated bilingual R32 analysis content + completeness test"
```

---

### Task 4: Seed script `seed-r32-analysis.ts`

**Files:**
- Create: `scripts/seed-r32-analysis.ts`

**Interfaces:**
- Consumes: `R32_ANALYSIS`, `R32_PAIRS` from `./r32-analysis-content`.
- Behavior: loads `stage = "R32"` matches, writes `analysisEs`/`analysisEn` from the map; dry-run unless `--write`; loud-fails on any unmatched pair (DB match without map entry, or map entry without DB match).

- [ ] **Step 1: Write the script**

Create `scripts/seed-r32-analysis.ts`:

```ts
/**
 * Seed curated bilingual analysis for the 16 World Cup 2026 R32 matches.
 *
 * Text lives in scripts/r32-analysis-content.ts (es: relator rioplatense,
 * en: tactical analyst). Keyed by "${homeCode}-${awayCode}".
 *
 *   npx tsx scripts/seed-r32-analysis.ts            # dry-run (no writes)
 *   npx tsx scripts/seed-r32-analysis.ts --write    # apply
 *
 * Against prod:
 *   bash scripts/_run-sync-prod.sh scripts/seed-r32-analysis.ts --write
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { R32_ANALYSIS, R32_PAIRS } from "./r32-analysis-content";

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const matches = await prisma.match.findMany({
    where: { stage: "R32" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  console.log(`[${mode}] ${matches.length} R32 matches found.\n`);

  const seenKeys = new Set<string>();
  let updated = 0;
  let missing = 0;

  for (const m of matches) {
    const key = `${m.homeTeam.code}-${m.awayTeam.code}`;
    const entry = R32_ANALYSIS[key];
    seenKeys.add(key);

    if (!entry) {
      console.error(`  ⚠️  NO CURATED TEXT for ${key} (${m.homeTeam.name} vs ${m.awayTeam.name})`);
      missing++;
      continue;
    }

    console.log(`  ${key}  ${m.homeTeam.name} vs ${m.awayTeam.name} → es+en ready`);

    if (write) {
      await prisma.match.update({
        where: { id: m.id },
        data: { analysisEs: entry.es, analysisEn: entry.en },
      });
      updated++;
    }
  }

  // Loud-fail on curated entries that never matched a fixture.
  const unmatched = R32_PAIRS.filter((p) => !seenKeys.has(p));
  if (unmatched.length > 0) {
    console.error(`\n⚠️  ${unmatched.length} curated pair(s) had no matching DB fixture: ${unmatched.join(", ")}`);
  }

  if (missing > 0) {
    console.error(`\n❌ ${missing} R32 match(es) have no curated text. Fix scripts/r32-analysis-content.ts and re-run.`);
  }

  if (write) {
    console.log(`\n✅ Done. Updated ${updated} matches.`);
  } else {
    console.log("\nℹ️  Dry-run only. Re-run with --write to apply.");
  }

  await prisma.$disconnect();
  if (missing > 0 || unmatched.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-r32-analysis.ts
git commit -m "feat: seed-r32-analysis script (dry-run/--write, loud-fail on gaps)"
```

> NOTE: running the seed against a live DB (`--write`) is a gated deploy step handled in Task 7, not here. Local DB is offline so no dry-run is possible locally.

---

### Task 5: Wire the read path (query + component + page)

**Files:**
- Modify: `src/lib/queries/matchDetail.ts` (type `MatchDetailData.match` ~line 37; `select` ~line 96)
- Modify: `src/components/match-detail/AIAnalysis.tsx`
- Modify: `src/app/(main)/matches/[matchId]/page.tsx` (two `<AIAnalysis>` sites, ~lines 161 and 190)

**Interfaces:**
- Consumes: `pickAnalysis()` from `src/lib/match-analysis.ts`.
- `AIAnalysis` props become `{ homeTeamName, awayTeamName, analysisEs, analysisEn, analysis }`.

- [ ] **Step 1: Extend the query type**

In `src/lib/queries/matchDetail.ts`, find:

```ts
    awayWinProb: number | null;
    analysis: string | null;
  };
```

Replace with:

```ts
    awayWinProb: number | null;
    analysis: string | null;
    analysisEs: string | null;
    analysisEn: string | null;
  };
```

- [ ] **Step 2: Extend the query select**

In the same file, find:

```ts
      awayWinProb: true,
      analysis: true,
    },
  });
```

Replace with:

```ts
      awayWinProb: true,
      analysis: true,
      analysisEs: true,
      analysisEn: true,
    },
  });
```

- [ ] **Step 3: Update the `AIAnalysis` component**

Replace the top of `src/components/match-detail/AIAnalysis.tsx` (imports + signature + the `analysisText` line) so it reads:

```tsx
import { getLocale, getTranslations } from "next-intl/server";
import { pickAnalysis } from "@/lib/match-analysis";

interface Props {
  homeTeamName: string;
  awayTeamName: string;
  analysis?: string | null;
  analysisEs?: string | null;
  analysisEn?: string | null;
}

export async function AIAnalysis({
  homeTeamName,
  awayTeamName,
  analysis,
  analysisEs,
  analysisEn,
}: Props) {
  const t = await getTranslations("matches.detail.analysis");
  const locale = await getLocale();
  const analysisText = pickAnalysis(
    locale,
    { es: analysisEs ?? null, en: analysisEn ?? null },
    analysis ?? null,
    t("default", { home: homeTeamName, away: awayTeamName }),
  );
```

(Leave the rest of the component's JSX unchanged.)

- [ ] **Step 4: Pass the new props at both render sites**

In `src/app/(main)/matches/[matchId]/page.tsx`, both `<AIAnalysis ... />` blocks currently read:

```tsx
              <AIAnalysis
                homeTeamName={teamLookup(match.homeTeam)}
                awayTeamName={teamLookup(match.awayTeam)}
                analysis={match.analysis}
              />
```

Add the two new props to **each** of the two occurrences:

```tsx
              <AIAnalysis
                homeTeamName={teamLookup(match.homeTeam)}
                awayTeamName={teamLookup(match.awayTeam)}
                analysis={match.analysis}
                analysisEs={match.analysisEs}
                analysisEn={match.analysisEn}
              />
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Lint**

Run: `npx eslint src/components/match-detail/AIAnalysis.tsx src/lib/queries/matchDetail.ts "src/app/(main)/matches/[matchId]/page.tsx"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/matchDetail.ts src/components/match-detail/AIAnalysis.tsx "src/app/(main)/matches/[matchId]/page.tsx"
git commit -m "feat: surface bilingual R32 analysis by active locale"
```

---

### Task 6: Honest i18n source label

**Files:**
- Modify: `messages/es.json` (`matches.detail.analysis.source`)
- Modify: `messages/en.json` (same key)

**Interfaces:** none (copy change only).

- [ ] **Step 1: Update the Spanish label**

In `messages/es.json`, change:

```json
        "source": "Basado en cuotas de NBC Sports / Sky Bet (marzo 2026)"
```

to:

```json
        "source": "Análisis Pencachi"
```

- [ ] **Step 2: Update the English label**

In `messages/en.json`, set the matching `matches.detail.analysis.source` value to:

```json
        "source": "Pencachi analysis"
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npx vitest run`
Expected: PASS (existing suite + new tests, ~312 total).

- [ ] **Step 4: Commit**

```bash
git add messages/es.json messages/en.json
git commit -m "chore(i18n): honest analysis source label"
```

---

### Task 7: Deploy gate (apply migration + seed prod) — REQUIRES USER APPROVAL

**Files:** none (ops only).

This task mutates the prod DB. Do NOT run it without explicit user confirmation (completion ritual).

- [ ] **Step 1: Ask the user** whether to apply the migration and seed against prod.

- [ ] **Step 2: Apply the migration to prod** (via the prod DB / `migrate deploy` path used by the deploy pipeline — confirm the exact mechanism with the user, since local DB is offline and migrations are normally applied on deploy).

- [ ] **Step 3: Dry-run the seed against prod**

Run: `bash scripts/_run-sync-prod.sh scripts/seed-r32-analysis.ts`
Expected: 16 matches, all `es+en ready`, no missing/unmatched warnings.

- [ ] **Step 4: Apply with --write**

Run: `bash scripts/_run-sync-prod.sh scripts/seed-r32-analysis.ts --write`
Expected: `✅ Done. Updated 16 matches.`

- [ ] **Step 5: Update the handoff** (remember skill) — this closes the feature.

---

## Self-Review

**Spec coverage:**
- Data model (analysisEs/En columns + migration) → Task 1. ✓
- Curated bilingual content (16×2) → Task 3. ✓
- Seed script (dry-run/--write, loud-fail) → Task 4. ✓
- Read path (query select + type, getLocale + pickAnalysis, both page sites) → Tasks 2 & 5. ✓
- i18n honest source label → Task 6. ✓
- Tests (pickAnalysis branches, map completeness) → Tasks 2 & 3. ✓
- Branch rule → Global Constraints + done. ✓
- Fixture-churn risk → noted in content module header + seed loud-fail. ✓

**Placeholder scan:** none — all code and copy is concrete.

**Type consistency:** `pickAnalysis(locale, {es, en}, legacy, fallback)` signature used identically in Task 2 (def), Task 5 (call). `R32_ANALYSIS` / `R32_PAIRS` names consistent across Tasks 3 & 4. Component props `analysisEs`/`analysisEn` consistent across Tasks 5's component and page edits and the query fields from Task 1.
