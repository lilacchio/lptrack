# LP Arena

Competitive PvP Meteora tournaments on Solana. Players compete on real LP performance over bounded seasons; LP Agent's native-denominated P&L data scores the leaderboard; Zap In/Out is the entry/exit mechanism.

Hackathon submission for the **LP Agent** side-track. Stack: 100% free tiers, Solana **devnet** for the demo.

- **What wins it**: turns LPing into a sport with verifiable scoring nobody else can reproduce.
- **Why the data is load-bearing**: scoring uses LP Agent's `dprNative` / `pnlNative` / `revenue` endpoints. The scoring *only works* with their data.
- **Why Zap is structural**: Zap In is how you enter an arena; Zap Out is how you exit at season end.

## Layout

```
specs/       product + tech specs (read these first)
programs/    Anchor program (on-chain escrow + settlement)
app/         Next.js frontend (created in Phase 2)
services/    backend: scoring cron, LP Agent client, scheduler (Phase 3)
mcp/         Claude Desktop MCP server (Phase 5, bolt-on)
todo.md      phased build checklist
```

See `specs/00-overview.md` for the full product, `todo.md` for the build order.
