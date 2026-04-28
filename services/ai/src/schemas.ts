// Output shapes for the four hint surfaces. Used by the heuristic stubs in
// coach.ts / rivals.ts / recap.ts / safety.ts and by the API route consumers.

export type CoachSuggestion = {
  bin_range_low: number;
  bin_range_high: number;
  strategy_preset: "Spot" | "Curve" | "BidAsk" | "BidAskImBalanced";
  rationale: string;
  risk_notes: string[];
};

export type RivalSummary = {
  rivals: Array<{
    owner: string;
    rank: number;
    headline: string; // one-sentence factual move summary
    detail: string;   // additional one-sentence context
  }>;
};

export type PostSeasonRecap = {
  final_rank: number;
  did_well: string;
  cost_you_rank: string;
  next_arena_cta: string;
};

export type SafetyInspection = {
  rating: "low" | "moderate" | "high" | "critical";
  summary: string;
  flags: Array<{
    label: string;
    value: string;
    threshold: string;
    breached: boolean;
  }>;
};
