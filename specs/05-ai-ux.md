# 05 — AI-Heavy UX (the hackathon differentiator)

AI is **ambient** in LP Arena, not central. It's not a chatbot. It's an assistive layer that makes LPing legible to non-experts and surfaces rival behavior to pros. Inspired by Shopify Sidekick's tone (conversational, confident, output-focused) and the Shopify Winter '26 emphasis on "realism-focused previews" over promises.

**Model: Claude Sonnet 4.6 via Anthropic API (`claude-sonnet-4-6`). Prompt caching for the system prompt.** Reasoning for model choice: quality matters more than latency in the UX; cost is low with caching; SDK is mature.

## Five AI touchpoints

### 1. AI Coach — Entry Wizard bin-range suggestion

Before a player picks a bin range, AI Coach runs. It's given:
- Pool ID, current active bin, bin step
- Last 7d of `feeStats` (hourly from `/pools/{id}/info`)
- Recent price volatility from `price_1h_change` / `price_6h_change`
- Arena duration (1h vs 24h vs 7d)
- Player's stated risk tolerance (Tight/Balanced/Wide)

Output: a **structured JSON** recommendation (enforced with tool use):
```json
{
  "bin_range_low": 1234,
  "bin_range_high": 1256,
  "strategy_preset": "BidAskImBalanced",
  "rationale": "In the last 6h, SOL/USDC has cycled ±0.4% around the active bin. For a 24h arena, a range that captures ~1.5× this cycle (bins 1234–1256) maximizes time-in-range without over-diluting fees.",
  "risk_notes": ["If SOL moves >2% outside, you'll go out-of-range. Enable auto-exit if you want to avoid that."]
}
```

UI: shown as an `<AiHint>` card in Step 1 of the wizard. The bin chart visually overlays the suggested range. There's a "Why?" button that expands to show the actual LP Agent data that informed it (realism, transparency).

### 2. Rival Scout — arena detail sidebar

During a live arena, a panel called "What's happening" shows short AI-authored summaries of the top-3 rivals' moves, based on `/lp-positions/logs?owner=<rival>`:

> **alice.sol** (rank 1) rebalanced 12m ago to bins 1240–1260 — tighter than the average entrant. She's now earning 1.4× the pool average fee rate.

> **bob.sol** (rank 3) hasn't moved since entry. His position drifted to the edge of his range; if SOL drops 0.3% he goes out-of-range.

Regenerates every 5 minutes. Prompt-cached system prompt + live position data as the user message. Strictly factual — no speculation.

### 3. Post-Season Recap — AI-authored performance review

After settlement, each entrant gets a "Recap" modal. AI is given:
- Their final rank + score
- Their `/lp-positions/logs` for the arena window
- Winner's logs + final score (for comparison)
- Pool price chart

Output structure:
- What you did well (concrete — "you entered 2h earlier than 60% of entrants, earning an extra 3bps of fee time")
- What cost you rank (concrete — "your bin range was 2.3× wider than the winner's, diluting your fee share by ~40%")
- Next-arena suggestion (a concrete CTA back into the funnel)

### 4. Safety Inspector — pre-deposit pool screen

When a player clicks a memecoin arena for the first time, AI Inspector surfaces risk in plain English:

> ⚠ **Moderate risk**. Top holder controls 18% of supply (threshold: 10%). Pool launched 47m ago (threshold: 24h). Mint authority is not frozen. *This arena has a safety auto-exit enabled; if any metric degrades below threshold, the arena cancels and everyone gets refunded.*

Driven by `/pools/discover` filter fields (`organic_score`, `top_holder`, `mint_freeze`, `age_hr`). Structured output → deterministic risk rating + human-readable sentence.

### 5. Natural-language arena entry (MCP bolt-on, Phase 5)

User in Claude Desktop types:
> Enter me into the SOL/USDC 24h arena with 0.5 SOL, balanced range.

MCP server exposes 6 tools: `list_arenas`, `arena_detail`, `suggest_range`, `enter_arena`, `my_positions`, `exit_arena`. Paired with Swig session key (scoped to LP Arena program + LP Agent zap endpoints, amount-capped, 24h expiry). Claude executes multi-step: fetch arena → call AI Coach for range → call LP Agent zap-in → sign with session key → confirm.

This is the "novel primitive" not-chatbot-wrapper bit: **scoped autonomous agency**. Demo it by entering an arena through Claude on camera without touching the web UI.

## Technical patterns

### Prompt caching

All system prompts use `cache_control: { type: "ephemeral" }`. Breakpoints:
1. System prompt (~1500 tokens, cached)
2. Pool metadata block (cached per pool per 10m)
3. Live data (user message, not cached)

Cost per AI Coach call at prompt-cached rates: ~$0.002. Budget for a 48h demo with 500 players: ~$5.

### Structured outputs enforced via tool use

Every AI call that returns structured data uses Anthropic's tool-use with a required schema. No JSON mode heuristics — we force the model to emit via a tool call and parse it. Details: see `specs/ref/ai-tool-schemas.ts` (to be written in Phase 2).

### Guardrails

- AI never says "you will win" or "this is guaranteed." System prompt forbids predictions.
- AI never suggests a pool outside the arena's declared pool — scoped strictly.
- AI never sees user's private keys. Only reads `/lp-positions/*` public endpoints for the player's public wallet.

### Fallbacks

If Anthropic API is unavailable (rate limit, outage), UI degrades gracefully:
- AI Coach → shows a deterministic heuristic-based range suggestion (± realized volatility).
- Rival Scout → shows the raw log as a list.
- Recap → shows rank + score only, no narrative.

## Design reference: `<AiHint />` component

```
┌────────────────────────────────────────────┐
│ ✨ Coach suggests: bins 1234–1256          │
│                                            │
│ In the last 6h, SOL/USDC cycled ±0.4%.     │
│ This range captures ~1.5× that cycle.      │
│                                            │
│ [ Apply ]   [ Why? ]   [ Let me pick ]    │
└────────────────────────────────────────────┘
```

Accent-color matches arena theme. "Why?" expands inline, doesn't open a modal.
