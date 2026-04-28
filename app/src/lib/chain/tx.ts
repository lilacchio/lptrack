import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import idl from "@/lib/idl/lp_arena.json";
import {
  PROGRAM_ID,
  entryPda,
  prizeVaultPda,
} from "./program";

type WalletAdapterLike = {
  publicKey: PublicKey | null;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
};

function getProgramFor(connection: Connection, wallet: WalletAdapterLike) {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction:
        wallet.signTransaction ?? ((t: Transaction) => Promise.resolve(t)),
      signAllTransactions:
        wallet.signAllTransactions ?? ((t: Transaction[]) => Promise.resolve(t)),
    } as never,
    { commitment: "confirmed" }
  );
  return new Program(idl as Idl, provider) as unknown as Program;
}

/**
 * Build the `enter_arena` transaction. Caller signs + sends via wallet adapter.
 *
 * `positionCommitment` is a 32-byte hash binding the entry to a specific bin
 * range. For the demo we use zeros; production wires this from the user's
 * chosen Zap-In bin range.
 */
export async function buildEnterArenaTx(
  connection: Connection,
  wallet: WalletAdapterLike,
  arena: PublicKey,
  positionCommitment: Uint8Array = new Uint8Array(32)
): Promise<Transaction> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");
  if (positionCommitment.length !== 32) {
    throw new Error("positionCommitment must be 32 bytes");
  }
  const program = getProgramFor(connection, wallet);
  const entry = entryPda(arena, wallet.publicKey);
  const vault = prizeVaultPda(arena);

  return program.methods
    .enterArena(Array.from(positionCommitment))
    .accountsStrict({
      arena,
      entry,
      prizeVault: vault,
      player: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
}

export async function buildClaimPayoutTx(
  connection: Connection,
  wallet: WalletAdapterLike,
  arena: PublicKey
): Promise<Transaction> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");
  const program = getProgramFor(connection, wallet);
  const entry = entryPda(arena, wallet.publicKey);
  const vault = prizeVaultPda(arena);

  return program.methods
    .claimPayout()
    .accountsStrict({
      arena,
      entry,
      prizeVault: vault,
      player: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
}

export async function buildClaimRefundTx(
  connection: Connection,
  wallet: WalletAdapterLike,
  arena: PublicKey
): Promise<Transaction> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");
  const program = getProgramFor(connection, wallet);
  const entry = entryPda(arena, wallet.publicKey);
  const vault = prizeVaultPda(arena);

  return program.methods
    .claimRefund()
    .accountsStrict({
      arena,
      entry,
      prizeVault: vault,
      player: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
}

// Re-export for callers that need fee math without importing BN.
export { BN };
