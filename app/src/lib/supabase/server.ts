import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service-role key.
 * Bypasses RLS — never import this file from a client component.
 */
export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required for server client"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type Arena = {
  pubkey: string;
  pool: string;
  protocol: string;
  entry_open_ts: number;
  entry_close_ts: number;
  end_ts: number;
  entry_fee_lamports: number;
  state: string;
  distribution_bps: number[];
  theme: string | null;
  created_at: string;
};

export type LeaderboardRow = {
  arena_pubkey: string;
  player_pubkey: string;
  rank: number;
  score: number;
  dpr_native: number;
  pnl_native: number;
  updated_at: string;
};

export type Entry = {
  arena_pubkey: string;
  player_pubkey: string;
  entry_tx: string | null;
  zap_in_signature: string | null;
  position_id: string | null;
  joined_at: string;
};
