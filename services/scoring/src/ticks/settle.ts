// Settlement cron: for each arena where now >= end_ts and on-chain state is
// still Pending / Active / Settling, build the SettlePayload from the latest
// Supabase leaderboard, sign with the scoring oracle, and submit
// [Ed25519 sigverify, lp_arena.settle_arena].
//
// Source of truth for the arena list is on-chain (`program.account.arena.all()`).
// Supabase is only consulted for the leaderboard rows the leaderboard tick has
// upserted — those are what determine final ranks.
import * as fs from "node:fs";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  BN,
  configPda,
  encodeSettlePayload,
  getConnection,
  getProgram,
  loadKeypair,
  prizeVaultPda,
  buildEd25519VerifyIx,
  signOraclePayload,
  sendV0,
  explorerTx,
  listProgramArenas,
  listProgramEntriesForArena,
  type ArenaSummary,
} from "../lib/chain.ts";
import { supabase, type LeaderboardRow } from "../lib/supabase.ts";
import { env } from "../env.ts";
import { log, warn, err } from "../lib/log.ts";

async function fetchLeaderboard(arenaPubkey: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("arena_pubkey", arenaPubkey)
    .order("rank", { ascending: true });
  if (error) throw new Error(`supabase leaderboard: ${error.message}`);
  return (data ?? []) as LeaderboardRow[];
}

export async function settleTick(opts: { smokePubkey?: string } = {}): Promise<void> {
  const conn = getConnection();
  const admin = loadKeypair(env.adminKeypairPath);
  const dryRun = env.settleDryRun;
  const smoke = opts.smokePubkey;

  if (smoke && !dryRun) {
    err("settle", "--smoke requires SETTLE_DRY_RUN=true (refusing to force-process a live arena)");
    return;
  }

  const all = await listProgramArenas(conn, admin);
  const nowSec = Math.floor(Date.now() / 1000);

  let due: ArenaSummary[];
  if (smoke) {
    const target = all.find((a) => a.pubkey.toBase58() === smoke);
    if (!target) {
      err("settle", `--smoke: no on-chain arena matches ${smoke}`);
      return;
    }
    log(
      "settle",
      `[smoke] forcing ${smoke.slice(0, 8)}… (state=${target.state}, endTs=${target.endTs}, now=${nowSec}, Δ=${target.endTs - nowSec}s)`,
    );
    due = [target];
  } else {
    // Settleable: end_ts has passed AND on-chain state is not yet finalised.
    due = all.filter(
      (a) =>
        a.endTs <= nowSec &&
        (a.state === "Pending" || a.state === "Active" || a.state === "Settling"),
    );
  }

  if (due.length === 0) {
    log("settle", "nothing due");
    return;
  }
  log("settle", `${due.length} arena(s) due${dryRun ? " [DRY RUN]" : ""}`);

  const oracleSecret = Uint8Array.from(
    JSON.parse(fs.readFileSync(env.oracleKeypairPath, "utf-8")),
  );
  const program = getProgram(conn, admin);

  for (const arena of due) {
    const arenaPk = arena.pubkey;
    try {
      // Re-fetch full account for distribution.winnerCount.
      // @ts-expect-error anchor 0.31 typing
      const arenaAcct: any = await program.account.arena.fetch(arenaPk);

      const winnerCount = Number(arenaAcct.distribution.winnerCount ?? 0);
      const lb = await fetchLeaderboard(arenaPk.toBase58());
      let ranked: { player: PublicKey; score: bigint }[];
      if (lb.length === 0) {
        if (smoke) {
          // Smoke mode: synthesize ranked list from on-chain entries so we
          // exercise the encode/sign/verify path even without a leaderboard.
          const entries = await listProgramEntriesForArena(conn, admin, arenaPk);
          if (entries.length === 0) {
            // No entries on-chain either — synthesize a stub roster from the
            // admin pubkey so the cryptographic encode/sign/verify path still
            // runs. Dry-run only; this would never reach `sendV0`.
            ranked = [{ player: admin.publicKey, score: 1n }];
            log("settle", `[smoke] no entries on-chain — using admin stub roster (1 player)`);
          } else {
            ranked = entries
              .slice(0, winnerCount)
              .map((e, i) => ({ player: e.player, score: BigInt(entries.length - i) }));
            log("settle", `[smoke] synthesized ${ranked.length} ranked entries from on-chain`);
          }
        } else {
          warn(
            "settle",
            `arena ${arenaPk.toBase58().slice(0, 8)}… has no leaderboard yet`,
          );
          continue;
        }
      } else {
        ranked = lb.slice(0, winnerCount).map((l) => ({
          player: new PublicKey(l.player_pubkey),
          score: BigInt(Math.max(0, Math.round((l.score ?? 0) * 1_000_000))),
        }));
      }

      const endTs = BigInt(arena.endTs);
      const payloadBytes = encodeSettlePayload(endTs, ranked);
      const { message, signature, pubkey } = signOraclePayload(
        oracleSecret,
        arenaPk,
        payloadBytes,
      );
      const ed25519Ix = buildEd25519VerifyIx(pubkey, message, signature);

      const [config] = configPda();
      const [prizeVault] = prizeVaultPda(arenaPk);

      const settleIx = await program.methods
        .settleArena({
          endTs: new BN(endTs.toString()),
          ranked: ranked.map((r) => ({
            player: r.player,
            score: new BN(r.score.toString()),
          })),
        } as any)
        .accountsStrict({
          config,
          arena: arenaPk,
          prizeVault,
          cranker: admin.publicKey,
          ixSysvar: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
        })
        .instruction();

      if (dryRun) {
        const sigOk = nacl.sign.detached.verify(
          message,
          signature,
          pubkey,
        );
        log(
          "settle",
          `[DRY RUN] arena ${arenaPk.toBase58().slice(0, 8)}… payload built — ${ranked.length} ranked, msg=${message.length}B, sig=${signature.length}B, oracle=${new PublicKey(pubkey).toBase58()}, ed25519_local_verify=${sigOk ? "PASS" : "FAIL"}`,
        );
        for (const [i, r] of ranked.entries()) {
          log(
            "settle",
            `[DRY RUN]   rank ${i + 1}: ${r.player.toBase58()} score=${r.score.toString()}`,
          );
        }
        log(
          "settle",
          `[DRY RUN] would submit [Ed25519 verify (${ed25519Ix.data.length}B), settle_arena] — skipping send`,
        );
        continue;
      }

      const sig = await sendV0(conn, admin, [ed25519Ix, settleIx]);
      log(
        "settle",
        `arena ${arenaPk.toBase58().slice(0, 8)}… settled — ${explorerTx(sig)}`,
      );
    } catch (e) {
      err("settle", `arena ${arenaPk.toBase58()} failed`, e);
    }
  }
}

if (process.argv.includes("--once")) {
  const smokeIdx = process.argv.indexOf("--smoke");
  const smokePubkey =
    smokeIdx > -1 && process.argv[smokeIdx + 1] ? process.argv[smokeIdx + 1] : undefined;
  settleTick({ smokePubkey })
    .then(() => process.exit(0))
    .catch((e) => {
      err("settle", "fatal", e);
      process.exit(1);
    });
}
