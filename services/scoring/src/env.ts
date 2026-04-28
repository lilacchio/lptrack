import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const env = {
  repoRoot,
  rpcUrl:
    process.env.HELIUS_DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
  lpAgentBaseUrl:
    process.env.LPAGENT_BASE_URL ?? "https://api.lpagent.io",
  lpAgentApiKey: required("LPAGENT_API_KEY"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  oracleKeypairPath:
    process.env.SCORING_ORACLE_KEYPAIR_PATH ??
    path.join(repoRoot, "keypairs", "scoring-oracle.json"),
  adminKeypairPath:
    process.env.ADMIN_KEYPAIR_PATH ??
    path.join(
      process.env.HOME ?? process.env.USERPROFILE ?? "",
      ".config",
      "solana",
      "id.json",
    ),
  // Cadences (ms). Override via env for prod tuning.
  leaderboardEveryMs: Number(process.env.LEADERBOARD_TICK_MS ?? 60_000),
  safetyEveryMs: Number(process.env.SAFETY_TICK_MS ?? 30_000),
  settleEveryMs: Number(process.env.SETTLE_TICK_MS ?? 30_000),
  eloEveryMs: Number(process.env.ELO_TICK_MS ?? 120_000),
  // Spawn cron: hourly check, no-op if any arena is already entry_open.
  spawnEveryMs: Number(process.env.SPAWN_TICK_MS ?? 60 * 60_000),
  // Settle dry-run: build payload, sign, verify Ed25519 locally, log everything,
  // but do NOT submit the transaction. Used for cron smoke tests.
  settleDryRun: process.env.SETTLE_DRY_RUN === "true",
};
