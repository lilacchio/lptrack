import { createClient } from "@supabase/supabase-js";
import { env } from "../env.ts";

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type ArenaRow = {
  pubkey: string;
  pool: string;
  protocol: string;
  entry_open_ts: number;
  entry_close_ts: number;
  end_ts: number;
  entry_fee_lamports: number;
  state: "open" | "active" | "settling" | "completed" | "cancelled" | string;
  distribution_bps: number[];
  theme: string | null;
};

export type EntryRow = {
  arena_pubkey: string;
  player_pubkey: string;
  entry_tx: string | null;
  zap_in_signature: string | null;
  position_id: string | null;
};

export type LeaderboardRow = {
  arena_pubkey: string;
  player_pubkey: string;
  rank: number;
  score: number;
  dpr_native: number;
  pnl_native: number;
};
