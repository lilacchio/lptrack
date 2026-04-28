/**
 * Apply Supabase SQL migrations using the service-role key.
 *
 * We don't depend on the supabase CLI — we POST raw SQL to the project's
 * PostgREST `rpc/exec_sql` extension if available, or fall back to using
 * `pg` directly via the connection string.
 *
 * Usage:
 *   pnpm --filter scripts run apply-supabase-migrations
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.env.local"
  ),
});

const { Client } = pg;

function projectRefFromUrl(url: string): string {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!m) throw new Error(`SUPABASE_URL malformed: ${url}`);
  return m[1];
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!url || !password) {
    throw new Error("SUPABASE_URL + SUPABASE_DB_PASSWORD required");
  }
  const ref = projectRefFromUrl(url);

  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../services/scoring/supabase/migrations"
  );
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Try the regional poolers (no IPv6 dependency, no IP allowlist needed).
  // Supabase rotates these — extend the list if your project is elsewhere.
  const regions = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "eu-central-1",
    "eu-west-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-south-1",
    "sa-east-1",
  ];

  let client: pg.Client | null = null;
  for (const region of regions) {
    const candidate = new Client({
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${ref}`,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      console.log(`[migrate] trying pooler ${region}…`);
      await candidate.connect();
      console.log(`[migrate] ✅ connected via ${region}.`);
      client = candidate;
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[migrate]   ${region}: ${msg.slice(0, 80)}`);
      try {
        await candidate.end();
      } catch {
        /* ignore */
      }
    }
  }

  if (!client) {
    console.error("\n[migrate] ❌ Could not reach the Supabase pooler.");
    console.error(
      "[migrate] Apply the SQL manually — open the Supabase Dashboard:"
    );
    console.error(
      `[migrate]   https://supabase.com/dashboard/project/${ref}/sql/new`
    );
    console.error("[migrate] then paste:");
    console.error(
      "[migrate]   services/scoring/supabase/migrations/001_init.sql"
    );
    process.exit(2);
  }

  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf-8");
    console.log(`[migrate] applying ${f} (${sql.length} bytes)`);
    try {
      await client.query(sql);
      console.log(`[migrate]   ✅ ${f} applied`);
    } catch (e) {
      console.error(`[migrate]   ❌ ${f} failed`);
      throw e;
    }
  }

  await client.end();
  console.log("[migrate] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
