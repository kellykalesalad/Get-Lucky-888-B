# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**番 Calculator** — a Hong Kong Mahjong fan (番) scoring app. Players step through a guided flow to describe a winning hand; the app calculates the total 番 and HK$ payout. There is also a multiplayer room mode where 4 players share live game state via a room code.

Deployed as a static site on **Netlify**. Backend is **Supabase** (Postgres + Realtime) used as an ephemeral key-value store: one `rooms` table holds `{ code, game_state (JSON blob), expires_at }`. No complex queries — the entire game state is serialized and pushed as a blob on every change.

## Branch workflow

**All work happens on a branch — never commit directly to `main`.**

- Before starting any task: `git checkout -b <descriptive-branch-name>`
- Branch naming: `refactor/vite-migration`, `feat/typescript`, `fix/scoring-bug`, etc.
- `main` is the production branch (auto-deploys to Netlify on push)
- Open a PR to merge back to `main`

## Current architecture (pre-migration)

Everything lives in a single `index.html` (~2,800 lines). There is no build step — Netlify serves the directory as-is (`netlify.toml`: `publish = "."`).

### Global state objects

| Object | Purpose |
|--------|---------|
| `S` | Current hand being scored. Holds `step`, `view`, `winType`, `conds`, `flowers`, `handType`, `suits`, `dragonTrips`, `windTrips`, `specialHand`, `minFan`, `maxFan`, etc. |
| `G` | Session/game tracking. Holds `players[]`, `eastIdx`, `roundWind`, `hands[]` (history), `maxFan`. |
| `R` | Room/multiplayer state. Holds `code`, `_pollTimer`, `_joining`. |

### Views (`S.view`)

The top-level `render()` function dispatches on `S.view`:
- `'lobby'` → `renderLobby()` — create/join room or go solo
- `'setup'` → `step1()` — player names, flower toggle, min/max fan
- `'calc'` → `calcPage()` — the main 5-step scoring flow
- `'results'` → `resultsPage()` — fan breakdown, payout, record button

### Scoring flow (`S.view === 'calc'`)

Steps are rendered inside `calcPage()`, gated by `S.step` (1–5):
1. Win type (自摸 / discard / special conditions)
2. Seat & round wind
3. Flowers (optional, skipped if `S.flowersIncluded === false`)
4. Hand type (sequences / triplets / special hands) + suit + dragons/winds
5. Results (calls `calcScore()` → displays breakdown)

### Key functions

- **`calcScore()`** — pure scoring logic, no DOM. Takes state from global `S` and `G`. Returns `{ total, bd[], jigu }`. This is the highest-value function to extract and test.
- **`render()`** — top-level UI dispatcher, re-renders the active view.
- **`renderNoScroll()`** — re-renders without scrolling (used for in-step interactions).
- **`updateHand()`** — redraws the sticky tile preview at the top.
- **`pushRoomState()`** — serializes `G` to JSON and upserts to Supabase `rooms`.
- **`subscribeRoom()`** — polls Supabase every few seconds and re-hydrates `G` from the blob.

### HK Mahjong scoring rules implemented

- Special hands: 十三幺 (13), 十八羅漢 (13), 九子連環 (10), 么九 (10), 字一色 (10), 大花糊 (8 flowers = 8), 花糊 (7 flowers = 3)
- Dragon sets: 大三元 (8), 小三元 (5), individual dragon triplets (1 each)
- Wind sets: 大四喜 (13), 小四喜 (6), seat/round wind triplets (1 each)
- Suit: 清一色 (7), 混一色 (3)
- Hand type: 對對糊 (3), 坎坎糊 (8), 平糊 (1)
- Conditions: 自摸 (1), 門前清 (1), 海底撈月 (1), 搶槓 (1), 槓上自摸 (1)
- Flowers: 正花 (1 each), complete plant/season set (2 each)
- Fan is capped at `G.maxFan` (default 8) and floored at `S.minFan` (default 3, configurable)

## Planned migration (do this on branches)

Target stack: **Vite + TypeScript + Vitest**

- `scoring.ts` — extract `calcScore()` as a pure, typed, tested module
- `room.ts` — Supabase multiplayer layer
- `game.ts` — `G` state and game management (players, hands, wind rotation)
- `app.ts` — UI rendering and step flow
- `styles.css` — extracted CSS
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (currently hardcoded — the anon key is safe to be public per Supabase's design, but env vars allow per-environment config)

The `calcScore()` function has no DOM or network dependencies and should be the first thing extracted and covered with tests.
