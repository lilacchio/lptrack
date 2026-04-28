// Deterministic-only mode: there's no LLM provider — every "AI" surface is
// powered by scenario-aware heuristic stubs in coach.ts / rivals.ts / recap.ts
// / safety.ts. We keep this module so the rest of the codebase can still
// `import { aiEnabled } from "ai"` without churning, but it always reports
// disabled and there is no `complete()` to call.
//
// Why no LLM: the four hint surfaces (coach / rivals / recap / safety) need to
// (a) work offline + during judging without leaking spend, (b) be reproducible
// for screenshots, and (c) never ship "the AI is thinking…" latency on a page
// that's already heavy. Scenario-rich heuristics deliver the same shape with
// none of the cost or flakiness, so we keep the heuristic path as the only
// path.

export function aiEnabled(): boolean {
  return false;
}
