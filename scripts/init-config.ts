import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getConnection,
  getProgram,
  loadKeypair,
  configPda,
  PROGRAM_ID,
  explorer,
  explorerAccount,
} from "./_util.ts";
import * as os from "node:os";
import * as path from "node:path";

async function main() {
  const conn = getConnection();
  const admin = loadKeypair(path.join(os.homedir(), ".config/solana/id.json"));
  const program = getProgram(conn, admin);

  const [config, bump] = configPda();
  console.log("[init-config] admin:", admin.publicKey.toBase58());
  console.log("[init-config] config PDA:", config.toBase58(), "(bump", bump, ")");

  const existing = await conn.getAccountInfo(config);
  if (existing) {
    console.log("[init-config] config already exists — skipping.");
    console.log("[init-config] ->", explorerAccount(config));
    return;
  }

  const oraclePubkey = new PublicKey(process.env.SCORING_ORACLE_PUBKEY!);
  const feeVault = new PublicKey(process.env.PROTOCOL_FEE_VAULT_PUBKEY!);

  const sig = await program.methods
    .initializeConfig(oraclePubkey, 200)
    .accountsStrict({
      config,
      admin: admin.publicKey,
      protocolFeeVault: feeVault,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc({ commitment: "confirmed" });

  console.log("[init-config] tx:", explorer(sig));
  console.log("[init-config] config:", explorerAccount(config));
  console.log("[init-config] program:", explorerAccount(PROGRAM_ID));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
