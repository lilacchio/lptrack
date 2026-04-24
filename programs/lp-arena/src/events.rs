use anchor_lang::prelude::*;

#[event]
pub struct ArenaCreated {
    pub arena: Pubkey,
    pub pool: Pubkey,
    pub start_ts: i64,
    pub end_ts: i64,
    pub entry_fee_lamports: u64,
    pub max_entrants: u16,
}

#[event]
pub struct EntryRegistered {
    pub arena: Pubkey,
    pub player: Pubkey,
    pub deposit_lamports: u64,
    pub pot_contribution_lamports: u64,
    pub entrant_index: u16,
}

#[event]
pub struct ArenaSettled {
    pub arena: Pubkey,
    pub total_prize_pot: u64,
    pub winner_count: u8,
}

#[event]
pub struct PayoutClaimed {
    pub arena: Pubkey,
    pub player: Pubkey,
    pub rank: u8,
    pub amount_lamports: u64,
}

#[event]
pub struct ArenaCancelled {
    pub arena: Pubkey,
    pub reason: u8, // 0 = under-subscribed, 1 = safety breaker, 2 = admin
}

#[event]
pub struct WagerPlaced {
    pub arena: Pubkey,
    pub spectator: Pubkey,
    pub predicted_winner: Pubkey,
    pub amount_lamports: u64,
}
