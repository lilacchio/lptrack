import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import idl from "@/lib/idl/lp_arena.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "Hrto23usPNyEYdmpVCVppM37M7vyBFd1sFhfRtTFGEc4"
);

// Read-only wallet shim for fetch-only uses (no signing).
const NULL_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: <T extends Transaction | VersionedTransaction>(t: T) =>
    Promise.resolve(t),
  signAllTransactions: <T extends Transaction | VersionedTransaction>(t: T[]) =>
    Promise.resolve(t),
};

export function getReadOnlyProgram(connection: Connection) {
  const provider = new AnchorProvider(connection, NULL_WALLET as never, {
    commitment: "confirmed",
  });
  // anchor 0.31 IDL typing is loose; cast through unknown.
  return new Program(idl as Idl, provider) as unknown as Program;
}

export function arenaPda(config: PublicKey, index: bigint): PublicKey {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(index);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("arena"), config.toBuffer(), indexBuf],
    PROGRAM_ID
  );
  return pda;
}

export function entryPda(arena: PublicKey, player: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("entry"), arena.toBuffer(), player.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function prizeVaultPda(arena: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("prize_vault"), arena.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export type ArenaAccount = {
  config: PublicKey;
  index: bigint;
  pool: PublicKey;
  entryOpenTs: bigint;
  entryCloseTs: bigint;
  endTs: bigint;
  entryFeeLamports: bigint;
  currentEntrantCount: number;
  state: unknown;
};

export type EntryAccount = {
  arena: PublicKey;
  player: PublicKey;
  entrantIndex: number;
  entryTs: bigint;
  depositLamports: bigint;
  potContributionLamports: bigint;
  finalRank: number; // 0 = unranked / DNP, 1..MAX_WINNERS = prize position
  finalScore: bigint;
  payoutClaimed: boolean;
};

export async function fetchEntry(
  connection: Connection,
  arena: PublicKey,
  player: PublicKey
): Promise<EntryAccount | null> {
  const program = getReadOnlyProgram(connection);
  const pda = entryPda(arena, player);
  const acct = await (program.account as Record<string, { fetchNullable: (k: PublicKey) => Promise<unknown> }>).entry.fetchNullable(pda);
  if (!acct) return null;
  const e = acct as {
    arena: PublicKey;
    player: PublicKey;
    entrantIndex: number;
    entryTs: { toString(): string };
    depositLamports: { toString(): string };
    potContributionLamports: { toString(): string };
    finalRank: number;
    finalScore: { toString(): string };
    payoutClaimed: boolean;
  };
  return {
    arena: e.arena,
    player: e.player,
    entrantIndex: e.entrantIndex,
    entryTs: BigInt(e.entryTs.toString()),
    depositLamports: BigInt(e.depositLamports.toString()),
    potContributionLamports: BigInt(e.potContributionLamports.toString()),
    finalRank: e.finalRank,
    finalScore: BigInt(e.finalScore.toString()),
    payoutClaimed: e.payoutClaimed,
  };
}

export async function fetchArena(
  connection: Connection,
  arena: PublicKey
): Promise<ArenaAccount | null> {
  const program = getReadOnlyProgram(connection);
  const acct = await (program.account as Record<string, { fetchNullable: (k: PublicKey) => Promise<unknown> }>).arena.fetchNullable(arena);
  if (!acct) return null;
  const a = acct as {
    config: PublicKey;
    index: { toString(): string };
    pool: PublicKey;
    entryOpenTs: { toString(): string };
    entryCloseTs: { toString(): string };
    endTs: { toString(): string };
    entryFeeLamports: { toString(): string };
    currentEntrantCount: number;
    state: unknown;
  };
  return {
    config: a.config,
    index: BigInt(a.index.toString()),
    pool: a.pool,
    entryOpenTs: BigInt(a.entryOpenTs.toString()),
    entryCloseTs: BigInt(a.entryCloseTs.toString()),
    endTs: BigInt(a.endTs.toString()),
    entryFeeLamports: BigInt(a.entryFeeLamports.toString()),
    currentEntrantCount: a.currentEntrantCount,
    state: a.state,
  };
}
