import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import anchorPkg from "@coral-xyz/anchor";
const { BN } = anchorPkg;
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getConnection,
  getProgram,
  loadKeypair,
  configPda,
  arenaPda,
  prizeVaultPda,
  entryPda,
  fundFromPayer,
  encodeSettlePayload,
  signOraclePayload,
  buildEd25519VerifyIx,
  sleepMs,
  explorer,
  explorerAccount,
} from "./_util.ts";

// 0.025 SOL × 4 players = 0.1 SOL pot; 2% protocol fee = 0.002 SOL > rent-exempt minimum,
// so the prize_vault PDA stays rent-exempt after all payouts drain the distributable share.
const ENTRY_FEE_SOL = 0.025;
const ENTRY_WINDOW_SEC = 35;
const TRADING_WINDOW_SEC = 40;

function log(step: string, msg: string) {
  const ts = new Date().toISOString().split("T")[1].slice(0, 8);
  console.log(`[${ts}] [${step}] ${msg}`);
}

async function main() {
  const conn = getConnection();
  const admin = loadKeypair(path.join(os.homedir(), ".config/solana/id.json"));
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const oraclePath = path.resolve(scriptsDir, "..", "keypairs/scoring-oracle.json");
  const oracleSecret = Uint8Array.from(JSON.parse(fs.readFileSync(oraclePath, "utf-8")));
  const program = getProgram(conn, admin);

  log("setup", `admin: ${admin.publicKey.toBase58()}`);
  log("setup", `admin balance: ${(await conn.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL} SOL`);

  // --- 0. Ensure config exists ---
  const [config] = configPda();
  const configAcct: any = await (program.account as any).arenaConfig.fetch(config);
  const arenaIndex = BigInt(configAcct.arenaCount.toString());
  log("setup", `config arena_count = ${arenaIndex}`);

  const [arena] = arenaPda(config, arenaIndex);
  const [prizeVault] = prizeVaultPda(arena);
  log("setup", `arena PDA: ${arena.toBase58()}`);

  // --- 1. Create arena ---
  const nowTs = Math.floor(Date.now() / 1000);
  const entryOpenTs = new BN(nowTs);
  const entryCloseTs = new BN(nowTs + ENTRY_WINDOW_SEC);
  const endTs = new BN(nowTs + ENTRY_WINDOW_SEC + TRADING_WINDOW_SEC);

  const mockPool = Keypair.generate().publicKey;
  const params = {
    pool: mockPool,
    poolProtocol: { meteoraDlmm: {} },
    entryOpenTs,
    entryCloseTs,
    endTs,
    entryFeeLamports: new BN(ENTRY_FEE_SOL * LAMPORTS_PER_SOL),
    potContributionBps: 10_000,
    minEntrants: 2,
    maxEntrants: 16,
    scoringMetric: { dprNative: {} },
    safetyGate: { minOrganicScoreBps: 0, requireMintFreeze: false, maxTopHolderBps: 10_000 },
    distribution: {
      bps: [5000, 3000, 2000, 0, 0, 0, 0, 0, 0, 0],
      winnerCount: 3,
    },
  };

  const sigCreate = await program.methods
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

  log("1.create", `✓ arena created  ${explorer(sigCreate)}`);

  // --- 2. Spin up 4 players, fund each, then enter ---
  const players: Keypair[] = [
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate(),
  ];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const fundSig = await fundFromPayer(conn, admin, p.publicKey, ENTRY_FEE_SOL + 0.005);
    log("2.fund", `player ${i + 1}: ${p.publicKey.toBase58()} funded  ${explorer(fundSig)}`);
  }

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const [entry] = entryPda(arena, p.publicKey);
    const commitment = new Uint8Array(32);
    commitment[0] = i + 1;

    const playerProgram = getProgram(conn, p);
    const sigEnter = await playerProgram.methods
      .enterArena(Array.from(commitment) as any)
      .accountsStrict({
        arena,
        entry,
        prizeVault,
        player: p.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([p])
      .rpc({ commitment: "confirmed" });
    log("3.enter", `player ${i + 1} entered  ${explorer(sigEnter)}`);
  }

  const arenaAcct1: any = await (program.account as any).arena.fetch(arena);
  log("3.enter", `current_entrant_count = ${arenaAcct1.currentEntrantCount}`);

  // --- 4. Wait for end_ts ---
  const waitSec = ENTRY_WINDOW_SEC + TRADING_WINDOW_SEC + 3;
  log("4.wait", `sleeping ${waitSec}s until arena ends…`);
  await sleepMs(waitSec * 1000);

  // --- 5. Build signed settlement payload ---
  //   Ranked winners: player 1 → 1st, player 2 → 2nd, player 3 → 3rd, player 4 → not ranked.
  const ranked = [
    { player: players[0].publicKey, score: 42_000n },
    { player: players[1].publicKey, score: 31_000n },
    { player: players[2].publicKey, score: 20_000n },
  ];

  const payloadBytes = encodeSettlePayload(BigInt(endTs.toString()), ranked);
  const { message, signature, pubkey } = signOraclePayload(oracleSecret, arena, payloadBytes);
  log("5.sign", `payload signed by oracle ${new PublicKey(pubkey).toBase58()}`);

  const ed25519Ix = buildEd25519VerifyIx(pubkey, message, signature);

  const settleIx = await program.methods
    .settleArena({
      endTs: new BN(endTs.toString()),
      ranked: ranked.map((r) => ({ player: r.player, score: new BN(r.score.toString()) })),
    } as any)
    .accountsStrict({
      config,
      arena,
      prizeVault,
      cranker: admin.publicKey,
      ixSysvar: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
    })
    .instruction();

  const latest = await conn.getLatestBlockhash("confirmed");
  const msgV0 = new TransactionMessage({
    payerKey: admin.publicKey,
    recentBlockhash: latest.blockhash,
    instructions: [ed25519Ix, settleIx],
  }).compileToV0Message();

  const vtx = new VersionedTransaction(msgV0);
  vtx.sign([admin]);
  const sigSettle = await conn.sendTransaction(vtx);
  await conn.confirmTransaction({ signature: sigSettle, ...latest }, "confirmed");
  log("6.settle", `✓ arena settled  ${explorer(sigSettle)}`);

  const arenaAcct2: any = await (program.account as any).arena.fetch(arena);
  log("6.settle", `state = ${JSON.stringify(arenaAcct2.state)}`);
  log("6.settle", `total_prize_pot = ${arenaAcct2.totalPrizePot.toString()} lamports`);
  log("6.settle", `protocol_fee_taken = ${arenaAcct2.protocolFeeTaken.toString()} lamports`);
  log("6.settle", `winners[0..3] = ${arenaAcct2.winners.slice(0, 3).map((w: PublicKey) => w.toBase58()).join(", ")}`);

  // --- 7. Top-3 winners claim ---
  for (let i = 0; i < 3; i++) {
    const p = players[i];
    const [entry] = entryPda(arena, p.publicKey);
    const before = await conn.getBalance(p.publicKey);
    const playerProgram = getProgram(conn, p);
    const sigClaim = await playerProgram.methods
      .claimPayout()
      .accountsStrict({
        arena,
        entry,
        prizeVault,
        player: p.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([p])
      .rpc({ commitment: "confirmed" });
    const after = await conn.getBalance(p.publicKey);
    log("7.claim", `player ${i + 1} rank=${i + 1} payout=${(after - before) / LAMPORTS_PER_SOL} SOL  ${explorer(sigClaim)}`);
  }

  // --- 8. Player 4 claim should fail (not in prize positions) ---
  try {
    const p = players[3];
    const [entry] = entryPda(arena, p.publicKey);
    const playerProgram = getProgram(conn, p);
    await playerProgram.methods
      .claimPayout()
      .accountsStrict({
        arena,
        entry,
        prizeVault,
        player: p.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([p])
      .rpc({ commitment: "confirmed" });
    log("8.guard", `✗ UNEXPECTED: player 4 claim succeeded`);
    process.exit(1);
  } catch (e: any) {
    log("8.guard", `✓ player 4 correctly rejected: ${e.message?.split("\n")[0] ?? e}`);
  }

  console.log("\n───────────────────────────────────────────");
  console.log("✓ Phase 1 exit criterion MET.");
  console.log("  - Arena:   ", explorerAccount(arena));
  console.log("  - Program: ", explorerAccount("Hrto23usPNyEYdmpVCVppM37M7vyBFd1sFhfRtTFGEc4"));
  console.log("───────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
