import { Keypair, SystemProgram } from "@solana/web3.js";
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
  const entryCloseTs = new BN(now + 60);      // 1 min entry window
  const endTs = new BN(now + 120);            // 2 min total

  const mockPool = Keypair.generate().publicKey;

  const params = {
    pool: mockPool,
    poolProtocol: { meteoraDlmm: {} },
    entryOpenTs,
    entryCloseTs,
    endTs,
    entryFeeLamports: new BN(10_000_000),     // 0.01 SOL
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

  console.log("[create-arena] index:", index.toString());
  console.log("[create-arena] arena PDA:", arena.toBase58());

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

  console.log("[create-arena] tx:", explorer(sig));
  console.log("[create-arena] arena:", explorerAccount(arena));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
