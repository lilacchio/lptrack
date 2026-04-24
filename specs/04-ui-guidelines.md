# 04 — UI Guidelines

Inspiration: [Shopify Editions Winter '26](https://www.shopify.com/editions/winter2026).
Goal: **restrained professional minimalism** with **moments of warmth** from AI-assisted micro-interactions. NOT cyberpunk crypto. NOT maximalist dashboards.

## Visual language

### Layout
- **Modular card stack.** Every major surface is a card on a neutral background. Cards have generous padding (`p-8` desktop, `p-5` mobile), soft 1px border in `border-zinc-200 dark:border-zinc-800`, corner radius `rounded-2xl`.
- **Asymmetric 60/40 splits** for arena detail pages: left = live leaderboard/bin chart, right = narrative ("the arena is 42% through, Alice leads by 3bps daily return").
- **Generous whitespace.** `gap-10` between major sections. Do not fill empty space with metrics nobody needs.
- **Max content width: 1200px.** Center on larger viewports.

### Typography
- **Font**: `Inter Tight` (variable, free, Google Fonts). One font family, four weights: 400, 500, 600, 700.
- Scale:
  - H1 (page title): `text-5xl font-semibold tracking-tight` (48px)
  - H2 (section): `text-3xl font-semibold tracking-tight`
  - H3 (card title): `text-xl font-medium`
  - Body: `text-[15px] leading-6` (Shopify-style — slightly bigger than default, generous line-height)
  - Numeric display (leaderboard ranks, SOL amounts): `font-mono tabular-nums text-2xl font-semibold`
  - Labels: `text-xs uppercase tracking-widest text-zinc-500`

### Color palette
Primary palette (neutral, Shopify-like):
- Background: `zinc-50` (light) / `zinc-950` (dark)
- Foreground: `zinc-900` / `zinc-50`
- Card: pure `white` / `zinc-900`
- Border: `zinc-200` / `zinc-800`
- Muted text: `zinc-500`

Accent (one per theme, rotates per arena season):
- "Solstice" (default): `emerald-500` (#10B981) CTA
- "Ember" (memecoin arenas): `orange-500`
- "Tidal" (stable arenas): `sky-500`
- "Aurora" (creator arenas): `violet-500`

Only ONE accent color on screen at a time. Never mix accents on the same page.

### Motion
- Page transitions: `framer-motion` with `layout` animations; 250ms ease-out.
- Leaderboard rank changes: position swap animates via `layoutId`. Subtle green flash for rank-up, red flash for rank-down. 400ms.
- Number changes (countdowns, P&L): morph with `framer-motion`'s `AnimatePresence` — do NOT count-up like a slot machine (too noisy).
- Micro-interactions only. No dramatic hero-section parallax. No background videos.

## Component inventory

### Core

1. **`<ArenaCard />`** — the tournament tile on the home grid
   - Accent-colored top strip (8px) per arena theme
   - Pool pair + pool type badge ("DLMM" / "DAMM v2")
   - Entry fee + max entrants as numeric display
   - "Starts in 2h 14m" countdown
   - Organic-score pill (green ≥70%, amber 50–70%, red <50%)
   - Hover: subtle card lift, no scale
2. **`<LiveLeaderboard />`** — animated ranked list
   - Row: rank, wallet avatar (gradient derived from pubkey, no PFP), short name (ENS-style "alice.sol" or truncated pubkey), SOL-denominated score, delta-vs-start
   - Realtime-push via Supabase Realtime subscription
   - Top-3 rows get a thin accent border-left
3. **`<BinChart />`** (visx-based)
   - X axis: bin IDs near active bin
   - Y axis: liquidity depth
   - Overlay: your position's bin range as a translucent accent-colored rectangle
   - Active bin marked with a vertical line + label
4. **`<EntryWizard />`** — AI-assisted flow
   - Step 1: pick strategy preset ("Tight / Balanced / Wide") OR "Let AI pick"
   - Step 2: confirm deposit amount
   - Step 3: review + sign (shows Zap-In route summary: "swapping 0.4 SOL → USDC via Jupiter, depositing into bin 1234–1256")
   - Powered by inline `<AiHint />` (see `05-ai-ux.md`)
5. **`<ArenaCountdown />`** — giant tabular-nums countdown that morphs (not counts up/down frame-by-frame)
6. **`<TrophyCase />`** on player profile — grid of cNFT trophies with Elo badge

### Shopify-inspired patterns to steal

- **Emoji-coded action cards** (from Sidekick Skills) — but use sparingly on "LP Moves" (e.g. 🎯 "Target a bin range", 🛡 "Enable safety auto-exit"). One emoji per card, no decoration.
- **Numbered step lists** with muted digits — for onboarding/tutorial and Entry Wizard.
- **Realism-focused previews** — when AI suggests a bin range, SHOW the bin chart with the range overlaid, don't just say "bins 1234–1256".
- **Trust through transparency** — every AI suggestion has a "Why?" expander that shows the exact LP Agent data that informed it.

## Dark mode

First-class. Default to system. Offer explicit toggle in the top nav. All accents have dark-mode contrast-checked variants.

## Mobile

Arena grid → single column. Leaderboard → remove delta column, show only rank + score. Entry Wizard → full-screen modal.
Target: Lighthouse ≥95 mobile. Zero layout shift. Fonts preloaded.

## Accessibility

- Contrast 4.5:1 minimum for body text, 3:1 for large.
- Every live leaderboard change announced via `aria-live="polite"`.
- Full keyboard nav in Entry Wizard.

## Do NOT

- Do not use gradient backgrounds on cards.
- Do not use shadcn's default "primary" blue — override per theme.
- Do not build a dashboard with 12 metric tiles. Three, max.
- Do not use green/red as the only rank-change indicator (colorblind-unsafe) — always pair with a ↑/↓ glyph.
- Do not play sounds. Ever.
