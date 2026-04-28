import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Ed25519Program,
} from "@solana/web3.js";
import anchorPkg from "@coral-xyz/anchor";
import nacl from "tweetnacl";
import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "../env.ts";

const { AnchorProvider, Program, Wallet, BN } = anchorPkg;

export const PROGRAM_ID = new PublicKey(
  "Hrto23usPNyEYdmpVCVppM37M7vyBFd1sFhfRtTFGEc4",
);

let _idl: any | null = null;
function loadIdl(): any {
  if (_idl) return _idl;
  const idlPath = path.join(env.repoRoot, "target", "idl", "lp_arena.json");
  _idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  return _idl;
}

export function loadKeypair(p: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function getConnection(): Connection {
  return new Connection(env.rpcUrl, "confirmed");
}

export function getProgram(connection: Connection, wallet: Keypair) {
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  return new Program(loadIdl() as any, provider);
}

export function configPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}

export function arenaPda(configKey: PublicKey, index: bigint): [PublicKey, number] {
  const idxBuf = Buffer.alloc(8);
  idxBuf.writeBigUInt64LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("arena"), configKey.toBuffer(), idxBuf],
    PROGRAM_ID,
  );
}

export function prizeVaultPda(arena: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prize_vault"), arena.toBuffer()],
    PROGRAM_ID,
  );
}

export function entryPda(arena: PublicKey, player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("entry"), arena.toBuffer(), player.toBuffer()],
    PROGRAM_ID,
  );
}

export function statsPda(player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stats"), player.toBuffer()],
    PROGRAM_ID,
  );
}

// --- Settlement helpers (mirror scripts/_util.ts) -------------------------

export function encodeSettlePayload(
  endTs: bigint,
  ranked: { player: PublicKey; score: bigint }[],
): Buffer {
  const parts: Buffer[] = [];
  const endBuf = Buffer.alloc(8);
  endBuf.writeBigInt64LE(endTs);
  parts.push(endBuf);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(ranked.length);
  parts.push(lenBuf);
  for (const r of ranked) {
    parts.push(r.player.toBuffer());
    const sbuf = Buffer.alloc(8);
    sbuf.writeBigInt64LE(r.score);
    parts.push(sbuf);
  }
  return Buffer.concat(parts);
}

export function signOraclePayload(
  oracleSecret: Uint8Array,
  arena: PublicKey,
  payloadBytes: Buffer,
): { message: Buffer; signature: Buffer; pubkey: Buffer } {
  const message = Buffer.concat([
    Buffer.from("LP_ARENA_SETTLE:"),
    arena.toBuffer(),
    payloadBytes,
  ]);
  const sig = nacl.sign.detached(message, oracleSecret);
  const kp = nacl.sign.keyPair.fromSecretKey(oracleSecret);
  return {
    message,
    signature: Buffer.from(sig),
    pubkey: Buffer.from(kp.publicKey),
  };
}

export function buildEd25519VerifyIx(
  pubkey: Buffer,
  message: Buffer,
  signature: Buffer,
): TransactionInstruction {
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: pubkey,
    message,
    signature,
  });
}

export async function sendV0(
  conn: Connection,
  payer: Keypair,
  ixs: TransactionInstruction[],
): Promise<string> {
  const latest = await conn.getLatestBlockhash("confirmed");
  const msg = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latest.blockhash,
    instructions: ixs,
  }).compileToV0Message();
  const vtx = new VersionedTransaction(msg);
  vtx.sign([payer]);
  const sig = await conn.sendTransaction(vtx);
  await conn.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  return sig;
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

// --- Arena listing (node-side, mirrors app/src/lib/chain/arenas.ts) -------

export type ArenaLifecycle =
  | "pending"
  | "entry_open"
  | "live"
  | "settling"
  | "settled"
  | "cancelled";

const ARENA_STATE_NUM_TO_NAME: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Settling",
  3: "Completed",
  4: "Cancelled",
};

export type ArenaSummary = {
  pubkey: PublicKey;
  index: bigint;
  pool: PublicKey;
  entryOpenTs: number;
  entryCloseTs: number;
  endTs: number;
  state: string;
  lifecycle: ArenaLifecycle;
};

function readEnumName(v: unknown): string {
  if (typeof v === "number") return ARENA_STATE_NUM_TO_NAME[v] ?? "Pending";
  if (typeof v === "object" && v !== null) {
    const k = Object.keys(v as Record<string, unknown>)[0] ?? "pending";
    return k.charAt(0).toUpperCase() + k.slice(1);
  }
  return "Pending";
}

export function deriveArenaLifecycle(
  state: string,
  entryOpenTs: number,
  entryCloseTs: number,
  nowSec: number,
): ArenaLifecycle {
  if (state === "Cancelled") return "cancelled";
  if (state === "Completed") return "settled";
  if (state === "Settling") return "settling";
  if (state === "Active") return "live";
  if (nowSec < entryOpenTs) return "pending";
  if (nowSec < entryCloseTs) return "entry_open";
  return "live";
}

export async function listProgramArenas(
  conn: Connection,
  admin: Keypair,
): Promise<ArenaSummary[]> {
  const program = getProgram(conn, admin);
  // @ts-expect-error anchor 0.31 typing
  const records: any[] = await program.account.arena.all();
  const nowSec = Math.floor(Date.now() / 1000);
  return records.map((rec) => {
    const a = rec.account;
    const state = readEnumName(a.state);
    const entryOpenTs = Number(a.entryOpenTs.toString());
    const entryCloseTs = Number(a.entryCloseTs.toString());
    const endTs = Number(a.endTs.toString());
    return {
      pubkey: rec.publicKey as PublicKey,
      index: BigInt(a.index.toString()),
      pool: a.pool as PublicKey,
      entryOpenTs,
      entryCloseTs,
      endTs,
      state,
      lifecycle: deriveArenaLifecycle(state, entryOpenTs, entryCloseTs, nowSec),
    };
  });
}

export type EntrySummary = {
  pubkey: PublicKey;
  arena: PublicKey;
  player: PublicKey;
  entrantIndex: number;
  entryTs: number;
  depositLamports: bigint;
  finalRank: number;
  finalScore: bigint;
  payoutClaimed: boolean;
};

/**
 * Fetches every Entry PDA owned by the program for `arena`. Uses the program
 * account `arena` field as a memcmp filter so we don't pull the entire Entry
 * set. Layout: 8 (discriminator) + 32 (arena pubkey) + … so offset 8.
 */
export async function listProgramEntriesForArena(
  conn: Connection,
  admin: Keypair,
  arena: PublicKey,
): Promise<EntrySummary[]> {
  const program = getProgram(conn, admin);
  // @ts-expect-error anchor 0.31 typing
  const records: any[] = await program.account.entry.all([
    { memcmp: { offset: 8, bytes: arena.toBase58() } },
  ]);
  return records.map((rec) => {
    const e = rec.account;
    return {
      pubkey: rec.publicKey as PublicKey,
      arena: e.arena as PublicKey,
      player: e.player as PublicKey,
      entrantIndex: Number(e.entrantIndex ?? 0),
      entryTs: Number(e.entryTs.toString()),
      depositLamports: BigInt(e.depositLamports.toString()),
      finalRank: Number(e.finalRank ?? 0),
      finalScore: BigInt(e.finalScore.toString()),
      payoutClaimed: Boolean(e.payoutClaimed),
    };
  });
}

export { BN };
