import dotenv from "dotenv";
dotenv.config({ path: "/opt/lptrack/.env.local" });
import { Connection } from "@solana/web3.js";
import {
  listProgramArenas,
  loadKeypair,
} from "/opt/lptrack/services/scoring/src/lib/chain.ts";

const conn = new Connection(process.env.HELIUS_DEVNET_RPC_URL!, "confirmed");
const admin = loadKeypair("/opt/lptrack/keys/admin.json");
const all = await listProgramArenas(conn, admin);
for (const a of all.filter(
  (x) => x.lifecycle === "entry_open" || x.lifecycle === "live"
)) {
  console.log(
    a.pubkey.toBase58() +
      " pool=" +
      a.pool.toBase58() +
      " lc=" +
      a.lifecycle +
      " end=" +
      new Date(a.endTs * 1000).toISOString()
  );
}
