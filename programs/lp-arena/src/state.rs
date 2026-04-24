use anchor_lang::prelude::*;

pub const MAX_WINNERS: usize = 10;       // top-N prize positions
pub const MAX_ENTRANTS_HARD_CAP: u16 = 256;

/// Global config. One per deployment. PDA seeds = [b"config"].
#[account]
pub struct ArenaConfig {
    pub admin: Pubkey,
    /// Ed25519 pubkey of the off-chain scoring oracle. Used to verify score
    /// submissions via the Ed25519 sigverify program in settle_arena.
    pub scoring_oracle: Pubkey,
    /// Protocol fee taken from prize pot, in bps.
    pub protocol_fee_bps: u16,
    pub protocol_fee_vault: Pubkey,
    pub paused: bool,
    pub arena_count: u64,
    pub bump: u8,
}

impl ArenaConfig {
    pub const LEN: usize = 8 + 32 + 32 + 2 + 32 + 1 + 8 + 1;
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ArenaState {
    Pending = 0,    // created, entry window not yet open (or open)
    Active = 1,     // trading window — no new entries
    Settling = 2,   // ended, awaiting oracle scores
    Completed = 3,  // scored, payouts claimable
    Cancelled = 4,  // refunds claimable
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ScoringMetric {
    DprNative = 0,  // daily % return, SOL-denominated — default
    PnlNative = 1,  // absolute SOL P&L
    RoiNative = 2,  // total ROI, SOL-denominated
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PoolProtocol {
    MeteoraDlmm = 0,
    MeteoraDammV2 = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct SafetyGate {
    /// Minimum `organic_score` from LP Agent pool metadata (0..10000 bps).
    pub min_organic_score_bps: u16,
    /// If set, require mint_freeze=true on both pool tokens.
    pub require_mint_freeze: bool,
    /// Max top-holder concentration allowed, in bps. 10000 = no cap.
    pub max_top_holder_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct PrizeDistribution {
    /// Payout bps per rank, index 0 = 1st place. Must sum to <= 10000.
    pub bps: [u16; MAX_WINNERS],
    pub winner_count: u8,
}

/// One tournament. PDA seeds = [b"arena", config.key(), arena_index.to_le_bytes()].
#[account]
pub struct Arena {
    pub config: Pubkey,
    pub index: u64,
    pub creator: Pubkey,                  // admin or user (for creator arenas)
    pub pool: Pubkey,                     // Meteora pool address (off-chain validated)
    pub pool_protocol: PoolProtocol,
    pub entry_open_ts: i64,
    pub entry_close_ts: i64,              // == trading start
    pub end_ts: i64,                      // trading end, settlement begins
    pub entry_fee_lamports: u64,
    /// What fraction of the entry fee goes to the prize pot (rest stays as "deposit float" that gets returned on exit).
    /// For the hackathon demo we keep this simple: the entire entry fee IS the pot contribution;
    /// players bring their own LP capital (Zap-In amount) separately.
    pub pot_contribution_bps: u16,
    pub min_entrants: u16,
    pub max_entrants: u16,
    pub current_entrant_count: u16,
    pub state: ArenaState,
    pub scoring_metric: ScoringMetric,
    pub safety_gate: SafetyGate,
    pub distribution: PrizeDistribution,
    pub prize_vault_bump: u8,
    pub bump: u8,
    /// Set at settlement. Index i holds the wallet that placed rank (i+1).
    pub winners: [Pubkey; MAX_WINNERS],
    pub total_prize_pot: u64,             // locked at settlement
    pub protocol_fee_taken: u64,
}

impl Arena {
    pub const LEN: usize = 8
        + 32 + 8 + 32 + 32 + 1          // config..pool_protocol
        + 8 + 8 + 8                     // timestamps
        + 8 + 2 + 2 + 2 + 2             // fees/counts
        + 1 + 1                         // state, metric
        + (2 + 1 + 2)                   // safety gate
        + (2 * MAX_WINNERS + 1)         // distribution
        + 1 + 1                         // bumps
        + 32 * MAX_WINNERS              // winners
        + 8 + 8;                        // pot, fee
}

/// One player's entry in an arena. PDA seeds = [b"entry", arena.key(), player.key()].
#[account]
pub struct Entry {
    pub arena: Pubkey,
    pub player: Pubkey,
    pub entrant_index: u16,               // 0..current_entrant_count
    pub entry_ts: i64,
    pub deposit_lamports: u64,
    pub pot_contribution_lamports: u64,
    /// Hash of (pool, player, position_id) as reported by off-chain scorer — commit-reveal style.
    /// The off-chain scorer treats this wallet's Meteora positions for this pool as their arena entry.
    pub position_commitment: [u8; 32],
    pub final_rank: u8,                   // 0 = unranked / DNP, 1..=MAX_WINNERS = prize position
    pub final_score: i64,                 // fixed-point, scaled 1e6 (e.g. DPR 0.042 → 42000)
    pub payout_claimed: bool,
    pub bump: u8,
}

impl Entry {
    pub const LEN: usize = 8 + 32 + 32 + 2 + 8 + 8 + 8 + 32 + 1 + 8 + 1 + 1;
}

/// Lifetime stats per wallet. PDA seeds = [b"stats", player.key()].
#[account]
pub struct PlayerStats {
    pub player: Pubkey,
    pub elo_rating: u32,                  // starts at 1200, fixed-point (no decimals, integer elo)
    pub arenas_played: u32,
    pub arenas_won: u32,
    pub lifetime_pot_winnings_lamports: u64,
    pub last_updated_ts: i64,
    pub bump: u8,
}

impl PlayerStats {
    pub const LEN: usize = 8 + 32 + 4 + 4 + 4 + 8 + 8 + 1;
    pub const INITIAL_ELO: u32 = 1200;
}

/// Optional spectator wager. PDA seeds = [b"wager", arena.key(), spectator.key()].
#[account]
pub struct Wager {
    pub arena: Pubkey,
    pub spectator: Pubkey,
    pub predicted_winner: Pubkey,
    pub amount_lamports: u64,
    pub placed_ts: i64,
    pub claimed: bool,
    pub bump: u8,
}

impl Wager {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}
