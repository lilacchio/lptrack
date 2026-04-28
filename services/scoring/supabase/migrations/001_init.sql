-- 001_init.sql — LP Arena schema
-- Run via:  pnpm --filter scripts run apply-supabase-migrations
--
-- Conventions:
-- - All Solana addresses + tx signatures stored as base58 text (no bytea).
-- - All on-chain integers stored as bigint (matches Anchor u64 within range).
-- - Reads are public via RLS; writes only happen with the service-role key.

create table if not exists arenas (
  pubkey            text primary key,
  pool              text not null,
  protocol          text not null,
  entry_open_ts     bigint not null,
  entry_close_ts    bigint not null,
  end_ts            bigint not null,
  entry_fee_lamports bigint not null,
  state             text not null default 'open',
  distribution_bps  integer[] not null default '{}',
  theme             text,
  created_at        timestamptz not null default now()
);
create index if not exists arenas_pool_idx on arenas (pool);
create index if not exists arenas_state_idx on arenas (state);

create table if not exists entries (
  arena_pubkey      text not null references arenas(pubkey) on delete cascade,
  player_pubkey     text not null,
  entry_tx          text,
  zap_in_signature  text,
  position_id       text,
  joined_at         timestamptz not null default now(),
  primary key (arena_pubkey, player_pubkey)
);

create table if not exists leaderboard (
  arena_pubkey      text not null references arenas(pubkey) on delete cascade,
  player_pubkey     text not null,
  rank              integer not null,
  score             double precision not null default 0,
  dpr_native        double precision not null default 0,
  pnl_native        double precision not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (arena_pubkey, player_pubkey)
);
create index if not exists leaderboard_arena_rank_idx
  on leaderboard (arena_pubkey, rank);

create table if not exists player_stats_cache (
  pubkey            text primary key,
  lifetime_pnl      double precision not null default 0,
  win_rate          double precision not null default 0,
  elo               integer not null default 1000,
  updated_at        timestamptz not null default now()
);

create table if not exists wagers (
  id                uuid primary key default gen_random_uuid(),
  arena_pubkey      text not null references arenas(pubkey) on delete cascade,
  wagerer_pubkey    text not null,
  predicted_winner  text not null,
  amount_lamports   bigint not null,
  placed_at         timestamptz not null default now(),
  settled_at        timestamptz,
  payout_lamports   bigint
);
create index if not exists wagers_arena_idx on wagers (arena_pubkey);

-- RLS: public read, no public write. Service-role bypasses RLS.
alter table arenas enable row level security;
alter table entries enable row level security;
alter table leaderboard enable row level security;
alter table player_stats_cache enable row level security;
alter table wagers enable row level security;

drop policy if exists "public read arenas" on arenas;
create policy "public read arenas" on arenas for select using (true);

drop policy if exists "public read entries" on entries;
create policy "public read entries" on entries for select using (true);

drop policy if exists "public read leaderboard" on leaderboard;
create policy "public read leaderboard" on leaderboard for select using (true);

drop policy if exists "public read player_stats_cache" on player_stats_cache;
create policy "public read player_stats_cache" on player_stats_cache for select using (true);

drop policy if exists "public read wagers" on wagers;
create policy "public read wagers" on wagers for select using (true);

-- Realtime broadcasts on the leaderboard table.
do $$ begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
exception when duplicate_object then null;
end $$;

alter publication supabase_realtime add table leaderboard;
