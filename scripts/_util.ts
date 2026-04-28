import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Ed25519Program,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, Program, Wallet, BN } = anchorPkg;
import nacl from "tweetnacl";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import idl from "../target/idl/lp_arena.json" with { type: "json" };
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env.local") });

export const PROGRAM_ID = new PublicKey("Hrto23usPNyEYdmpVCVppM37M7vyBFd1sFhfRtTFGEc4");

export function loadKeypair(p: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function rpcUrl(): string {
  return process.env.HELIUS_DEVNET_RPC_URL || "https://api.devnet.solana.com";
}

export function getConnection(): Connection {
  return new Connection(rpcUrl(), "confirmed");
}

export function getProgram(connection: Connection, wallet: Keypair) {
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  // @ts-expect-error anchor 0.31 IDL typing
  return new Program(idl as any, provider);
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

export async function airdropIfNeeded(
  conn: Connection,
  pk: PublicKey,
  minSol: number,
  topUpSol: number,
) {
  const bal = await conn.getBalance(pk);
  if (bal >= minSol * LAMPORTS_PER_SOL) return;
  const sig = await conn.requestAirdrop(pk, topUpSol * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
}

export async function fundFromPayer(
  conn: Connection,
  payer: Keypair,
  to: PublicKey,
  sol: number,
) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: to,
      lamports: Math.round(sol * LAMPORTS_PER_SOL),
    }),
  );
  return sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed" });
}

/**
 * Borsh-encode SettlePayload { end_ts: i64, ranked: Vec<RankedEntrant> }
 * RankedEntrant = { player: Pubkey (32 bytes), score: i64 }
 */
export function encodeSettlePayload(endTs: bigint, ranked: { player: PublicKey; score: bigint }[]): Buffer {
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

/**
 * Build message bytes: "LP_ARENA_SETTLE:" || arena || borsh(payload).
 * Sign with oracle Ed25519 secret key.
 */
export function signOraclePayload(
  oracleSecret: Uint8Array, // 64-byte nacl secret key
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
  return { message, signature: Buffer.from(sig), pubkey: Buffer.from(kp.publicKey) };
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

export async function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function explorer(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAccount(a: PublicKey | string): string {
  return `https://explorer.solana.com/address/${a.toString()}?cluster=devnet`;
}
