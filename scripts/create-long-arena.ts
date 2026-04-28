/**
 * Spin up a long-running devnet arena that lives through the judging window.
 *
 * Differences vs `create-test-arena.ts` (which makes a 2-min smoke arena):
 *   - 7-day duration (entry window 24h, total 7d)
 *   - Larger entrant cap (64) so we can keep adding test wallets over the week
 *   - Pool field is set to a real top-TVL Meteora pool from LP Agent — the
 *     program treats it as opaque, but using a real pubkey makes the demo
 *     coherent (the off-chain scorer reads that pool's actual LP data).
 *
 * Usage (from WSL — Windows shell can't sign devnet txs):
 *   pnpm --filter scripts run create-long-arena
 *
 * After running, paste the printed arena PDA + tx into ENDPOINT_MATRIX.md
 * and the README "Devnet proofs" section.
 */
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import anchorPkg from "@coral-xyz/anchor";
const { BN } = anchorPkg;
import {
  getConnection,
  getProgram,
  loadKeypair,
  configPda,
  arenaPda,
  prizeVaultPda,
  explorer,
  explorerAccount,
} from "./_util.ts";
import * as os from "node:os";
import * as path from "node:path";

// Real Meteora pool address — top-TVL SOL-quoted USD1 pool (DLMM v2). Stable
// during the judging window. Override with `LP_ARENA_POOL_OVERRIDE` if needed.
const DEFAULT_POOL = "6AJYTtz4h3HdxNcu66jdzLLWjggyfuEvRYa7tfPbxThi";
const ONE_DAY = 24 * 60 * 60;

async function main() {
  const conn = getConnection();
  const admin = loadKeypair(path.join(os.homedir(), ".config/solana/id.json"));
  const program = getProgram(conn, admin);

  const [config] = configPda();
  const configAcct: any = await (program.account as any).arenaConfig.fetch(config);
  const index = BigInt(configAcct.arenaCount.toString());
  const [arena] = arenaPda(config, index);
  const [prizeVault] = prizeVaultPda(arena);

  const now = Math.floor(Date.now() / 1000);
  const entryOpenTs = new BN(now);
  const entryCloseTs = new BN(now + 1 * ONE_DAY); // 24h entry window
  const endTs = new BN(now + 7 * ONE_DAY); // 7-day arena

  const poolStr = process.env.LP_ARENA_POOL_OVERRIDE ?? DEFAULT_POOL;
  const pool = new PublicKey(poolStr);

  const params = {
    pool,
    poolProtocol: { meteoraDlmm: {} },
    entryOpenTs,
    entryCloseTs,
    endTs,
    entryFeeLamports: new BN(25_000_000), // 0.025 SOL — keeps demo accessible
    potContributionBps: 10_000,
    minEntrants: 2,
    maxEntrants: 64,
    scoringMetric: { dprNative: {} },
    safetyGate: {
      minOrganicScoreBps: 0,
      requireMintFreeze: false,
      maxTopHolderBps: 10_000,
    },
    distribution: {
      bps: [5000, 3000, 2000, 0, 0, 0, 0, 0, 0, 0],
      winnerCount: 3,
    },
  };

  console.log("[create-long-arena] index:", index.toString());
  console.log("[create-long-arena] pool:", pool.toBase58());
  console.log("[create-long-arena] arena PDA:", arena.toBase58());
  console.log(
    "[create-long-arena] entry window:",
    new Date(entryOpenTs.toNumber() * 1000).toISOString(),
    "→",
    new Date(entryCloseTs.toNumber() * 1000).toISOString()
  );
  console.log(
    "[create-long-arena] arena ends:",
    new Date(endTs.toNumber() * 1000).toISOString()
  );

  const sig = await program.methods
    .createArena(params as any)
    .accountsStrict({
      config,
      arena,
      prizeVault,
      creator: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc({ commitment: "confirmed" });

  console.log("\n[create-long-arena] ✅ created");
  console.log("[create-long-arena] tx:", explorer(sig));
  console.log("[create-long-arena] arena:", explorerAccount(arena));
  console.log("[create-long-arena] prize vault:", explorerAccount(prizeVault));
  console.log("\nPaste these into README + ENDPOINT_MATRIX.md.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
