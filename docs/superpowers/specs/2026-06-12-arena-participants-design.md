# Arena Participants Sidebar — Design

**Date:** 2026-06-12
**Route:** `/prediction-arena` (a.k.a. "arena")
**Branch:** `feat/arena-participants`

## Problem

The arena page shows event cards and a cumulative-points leaderboard, but there's
no view of **who is playing the current round**. Users can't see at a glance who
has jumped into this week's arena.

## Goal

Add a list of the participants of the **active week** — the users who already made
at least one prediction this week — as a sticky right sidebar next to the cards.

## Scope

- New sticky right-hand sidebar listing current-week participants.
- Header with live count ("12 jugando").
- Each row: avatar + nickname + progress `N/6` (events predicted), with a "you" marker.
- Resolved week: show that week's points (gold) instead of `N/6`.
- Bilingual EN/ES strings.
- Unit test for the pure shaping/ordering logic.

## Out of scope

- No changes to the leaderboard, card grid, or prediction flow.
- No real-time/polling; refreshes via the existing `router.refresh()` on save.

## Layout

- Header stays full-width at top.
- Below: a two-column row — **left** = card grid + save bar, **right** = participants
  sidebar (~240px, `position: sticky; top`).
- **Arena Leaders** and **History** remain full-width below, unchanged.
- Responsive via CSS only (no JS mobile hooks): two columns at `lg+`; below `lg`
  the sidebar drops below the cards in natural document order.
- The card grid reflows inside its narrower column (1 → 2 cols).

## Data

- New query `getArenaParticipants(weekId)` in `src/lib/queries/prediction-arena.ts`.
  - Fetches the week's predictions (`userId`, `points`, `createdAt`, user
    avatar/nickname).
  - A pure function `shapeParticipants(predictions, weekStatus)` groups by user →
    `{ user, predicted: count, earliest, weekPoints }`.
- Ordering: progress `N/6` desc, tiebreak by earliest prediction asc (rewards the
  most complete and the earliest players).
- Added to the existing `Promise.all` in `page.tsx` — single query, no N+1.

## i18n

- New keys under `arena.participants` in **both** `messages/en.json` and
  `messages/es.json`: `title`, `count`, `progress`, `empty`.

## Acceptance criteria

1. With an active week that has predictions, the sidebar lists every user who has
   ≥1 prediction this week, ordered by progress then earliest.
2. Each row shows avatar, nickname, and `N/6`; the current user shows the "you" marker.
3. The header shows the participant count.
4. In a resolved week, rows show that week's points instead of `N/6`.
5. With no participants, the sidebar shows an empty state (or is hidden).
6. On screens below `lg`, the sidebar renders below the card grid.
7. Strings exist in both `en.json` and `es.json`.

## Tests

- **Unit (Vitest):** `shapeParticipants()` — dedupes by user, counts predictions,
  orders by progress + earliest, computes weekPoints. Pure function, no DB mock.
- **E2E (optional, Playwright):** sidebar shows participants on an arena with predictions.

## Risks

- Card grid feels cramped at `lg` with the sidebar taking width — mitigated by the
  grid reflowing to fewer columns in its narrower container.
