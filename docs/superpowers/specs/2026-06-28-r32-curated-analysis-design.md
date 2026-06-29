# R32 Curated Bilingual Match Analysis — Design

**Date:** 2026-06-28
**Branch:** `feat/r32-curated-analysis`
**Status:** Approved (design), pending implementation plan

## Problem

The "Análisis IA" panel on the match-detail page shows the **same stale prose** for
every Round-of-32 (R32) match. There is no real AI and no live data: the text is
generated offline by `scripts/seed-match-probabilities.ts` via `generateAnalysis()`,
which picks from **8 hardcoded templates** (4 favoritism tiers × 2 variants) filled
with static per-team description sentences. The variant is chosen by a deterministic
hash `(homeCode.charCodeAt(0) + awayCode.charCodeAt(0)) % 2`. When `Match.analysis` is
null, `AIAnalysis.tsx` falls back to a single identical i18n paragraph
(`matches.detail.analysis.default`). Result: zero real variety or personality.

## Goal

Give each R32 match a **distinctive, hand-authored analysis with personality**, in two
languages with **different editorial voices per language**, surfaced according to the
active locale.

- **ES → relator rioplatense con humor** (picante, jodón, color mundialero).
- **EN → tactical analyst with spark** (credible, football-literate, witty punchlines).

The texts are authored by the assistant (Claude) directly at implementation time and
baked into a seed script as static content. **No runtime LLM call, no API key, no
third-party scraping.**

## Scope

- **In scope:** the 16 R32 matches only. Two languages (es, en). Manual re-runnable
  seed script. Read-path locale selection. Tests.
- **Out of scope (for now):** R16→Final and group stage (same approach can extend
  later); admin button / cron automation; live data feeds; any scraping.

## Approach (chosen)

Store two nullable scalar columns on `Match` (`analysisEs`, `analysisEn`) — consistent
with the existing scalar style (`homeWinProb`, `drawProb`, …). Rejected alternatives: a
single JSON `analysisI18n` column (untyped, breaks the scalar pattern, no benefit for 2
locales) and a separate `MatchAnalysis(matchId, locale, text)` table (overkill, YAGNI).

## Components

### 1. Data model
- Prisma migration adds `analysisEs String?` and `analysisEn String?` to `Match`.
- The legacy `analysis String?` column is **kept** as a fallback (group-stage rows still
  use it; not touched by this work).

### 2. Curated content
- 16 R32 matches × 2 languages, ~2–4 sentences each, referencing the real teams in the
  tie (favoritism, history, narrative hooks).
- The actual 16 R32 pairings are pulled from the DB before authoring so texts match
  reality.
- Stored as a map keyed by team-pair `"${homeCode}-${awayCode}"` (DB home/away order).

### 3. Seed script `scripts/seed-r32-analysis.ts`
- Same shape as `seed-match-probabilities.ts`: `dotenv` (`.env.local`) + `PrismaPg`,
  `--dry-run` default / `--write` to apply. Re-runnable.
- Loads `stage = R32` matches, matches each against the curated map, writes both
  columns.
- **Fails loud** (logs) on any R32 match with no curated entry, and on any curated entry
  with no matching DB fixture — no silent gaps.
- Can be run against prod via the existing `scripts/_run-sync-prod.sh` SSH-tunnel helper.

### 4. Read path
- `src/lib/queries/matchDetail.ts`: `select` adds `analysisEs`, `analysisEn`; the
  `MatchDetailData.match` type gains both fields.
- `src/components/match-detail/AIAnalysis.tsx`: receives both texts, calls
  `getLocale()` (next-intl/server, as `MatchList` does), and selects via a pure helper
  `pickAnalysis(locale, { es, en }, legacy, fallback)` with the fallback chain:
  **locale-specific → legacy `analysis` → i18n default**.
- `src/app/(main)/matches/[matchId]/page.tsx`: update **both** `<AIAnalysis>` render
  sites (mobile + desktop) to pass `analysisEs` / `analysisEn`.

### 5. i18n / label
- The "source" sub-label currently reads *"Basado en cuotas de NBC Sports / Sky Bet…"*,
  which is false for editorial prose. Change to an honest label (e.g. *"Análisis
  Pencachi"* / *"Pencachi analysis"*) in `messages/es.json` and `messages/en.json`.
- The `default` analysis strings remain as the last-resort fallback.

## Data flow

```
seed-r32-analysis.ts (manual, --write)
   curated map  ──►  Match.analysisEs / Match.analysisEn   (DB, both locales stored)
                              │
match-detail page (server) ──►  getMatchDetailData() selects both columns
                              │
                     <AIAnalysis analysisEs analysisEn />
                              │  getLocale()
                     pickAnalysis() ─► locale text → legacy → i18n default
                              │
                          rendered prose
```

Both languages are stored simultaneously because a single installation's DB serves
users who can switch locale (cookie + DB persistence); selection happens at render by
active locale.

## Error handling
- Seed: missing/extra pair → loud log, non-zero summary; `--dry-run` prints the full
  diff before any write.
- Read: any null locale text degrades gracefully through the fallback chain; the panel
  never renders empty.

## Testing (definition-of-done in this repo)
- Unit test for `pickAnalysis()` covering every fallback branch (es, en, legacy-only,
  default-only).
- Unit test asserting the curated map covers all 16 R32 team-pairs and that every entry
  has non-empty `es` and `en`.
- `tsc --noEmit` + eslint clean; full unit suite green.

## Risks / open items
- **Fixture churn:** texts are baked in; if an R32 tie changes, that pair must be
  rewritten and the script re-run. Acceptable per the explicit "no runtime generation"
  decision.
- Keying by `homeCode-awayCode` assumes DB home/away order is stable; the seed's
  loud-fail on unmatched pairs catches drift.

## Branch rule
Work happens on `feat/r32-curated-analysis` (never on `master`).
