//! LP Arena — PvP Meteora tournaments on Solana.
//!
//! This program escrows entry fees into a prize pot, tracks entrants, and
//! distributes winnings after an off-chain scorer (signed by a registered
//! oracle keypair) submits ranked results backed by LP Agent data.
//!
//! Trust model for the hackathon demo: the scoring oracle is a backend
//! keypair registered in `ArenaConfig.scoring_oracle`. Anyone can verify
//! scores off-chain by re-querying the public LP Agent API with the same
//! `(pool, player, window)` tuple and comparing `dprNative` / `pnlNative`.
//! This is acceptable for devnet; a v2 path could post-hoc move to a
//! Switchboard TEE feed or LP Agent attestations once they ship signing.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    sysvar::instructions::{self as ix_sysvar, load_instruction_at_checked},
};

pub mod errors;
pub mod events;
pub mod state;

use errors::ArenaError;
use events::*;
use state::*;

declare_id!("Hrto23usPNyEYdmpVCVppM37M7vyBFd1sFhfRtTFGEc4");

#[program]
pub mod lp_arena {
    use super::*;

    // ---------------------------------------------------------------------
    // 1. Admin: initialize global config.
    // ---------------------------------------------------------------------
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        scoring_oracle: Pubkey,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.scoring_oracle = scoring_oracle;
        cfg.protocol_fee_bps = protocol_fee_bps;
        cfg.protocol_fee_vault = ctx.accounts.protocol_fee_vault.key();
        cfg.paused = false;
        cfg.arena_count = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 2. Create an arena. Permissioned in phase 1, permissionless in phase 4 (creator arenas).
    // ---------------------------------------------------------------------
    pub fn create_arena(
        ctx: Context<CreateArena>,
        params: CreateArenaParams,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ArenaError::Unauthorized);

        let total_bps: u32 = params
            .distribution
            .bps
            .iter()
            .take(params.distribution.winner_count as usize)
            .map(|b| *b as u32)
            .sum();
        require!(total_bps <= 10_000, ArenaError::InvalidDistribution);
        require!(
            params.distribution.winner_count as usize <= MAX_WINNERS
                && params.distribution.winner_count > 0,
            ArenaError::InvalidDistribution
        );
        require!(
            params.max_entrants <= MAX_ENTRANTS_HARD_CAP && params.min_entrants >= 2,
            ArenaError::InvalidDistribution
        );
        require!(
            params.entry_close_ts > params.entry_open_ts
                && params.end_ts > params.entry_close_ts,
            ArenaError::ArenaNotOpen
        );

        let index = ctx.accounts.config.arena_count;
        let arena = &mut ctx.accounts.arena;

        arena.config = ctx.accounts.config.key();
        arena.index = index;
        arena.creator = ctx.accounts.creator.key();
        arena.pool = params.pool;
        arena.pool_protocol = params.pool_protocol;
        arena.entry_open_ts = params.entry_open_ts;
        arena.entry_close_ts = params.entry_close_ts;
        arena.end_ts = params.end_ts;
        arena.entry_fee_lamports = params.entry_fee_lamports;
        arena.pot_contribution_bps = params.pot_contribution_bps;
        arena.min_entrants = params.min_entrants;
        arena.max_entrants = params.max_entrants;
        arena.current_entrant_count = 0;
        arena.state = ArenaState::Pending;
        arena.scoring_metric = params.scoring_metric;
        arena.safety_gate = params.safety_gate;
        arena.distribution = params.distribution;
        arena.prize_vault_bump = ctx.bumps.prize_vault;
        arena.bump = ctx.bumps.arena;
        arena.winners = [Pubkey::default(); MAX_WINNERS];
        arena.total_prize_pot = 0;
        arena.protocol_fee_taken = 0;

        ctx.accounts.config.arena_count = index.checked_add(1).ok_or(ArenaError::MathOverflow)?;

        emit!(ArenaCreated {
            arena: arena.key(),
            pool: arena.pool,
            start_ts: arena.entry_close_ts,
            end_ts: arena.end_ts,
            entry_fee_lamports: arena.entry_fee_lamports,
            max_entrants: arena.max_entrants,
        });
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 3. Player enters an arena. Pays entry fee; creates Entry PDA.
    //    Zap-In to Meteora happens off-chain via LP Agent API *after* this
    //    ix, using the same player wallet — the backend detects the new
    //    position and matches it to this Entry for scoring.
    // ---------------------------------------------------------------------
    pub fn enter_arena(ctx: Context<EnterArena>, position_commitment: [u8; 32]) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        let clock = Clock::get()?;

        require!(
            arena.state == ArenaState::Pending,
            ArenaError::ArenaNotOpen
        );
        require!(
            clock.unix_timestamp >= arena.entry_open_ts
                && clock.unix_timestamp < arena.entry_close_ts,
            ArenaError::EntryWindowClosed
        );
        require!(
            arena.current_entrant_count < arena.max_entrants,
            ArenaError::ArenaFull
        );

        // Transfer entry fee: player -> prize_vault.
        let fee = arena.entry_fee_lamports;
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.prize_vault.to_account_info(),
                },
            ),
            fee,
        )?;

        let pot_contribution = (fee as u128)
            .checked_mul(arena.pot_contribution_bps as u128)
            .and_then(|v| v.checked_div(10_000))
            .ok_or(ArenaError::MathOverflow)? as u64;

        let entry = &mut ctx.accounts.entry;
        entry.arena = arena.key();
        entry.player = ctx.accounts.player.key();
        entry.entrant_index = arena.current_entrant_count;
        entry.entry_ts = clock.unix_timestamp;
        entry.deposit_lamports = fee;
        entry.pot_contribution_lamports = pot_contribution;
        entry.position_commitment = position_commitment;
        entry.final_rank = 0;
        entry.final_score = 0;
        entry.payout_claimed = false;
        entry.bump = ctx.bumps.entry;

        arena.current_entrant_count = arena
            .current_entrant_count
            .checked_add(1)
            .ok_or(ArenaError::MathOverflow)?;

        emit!(EntryRegistered {
            arena: arena.key(),
            player: entry.player,
            deposit_lamports: fee,
            pot_contribution_lamports: pot_contribution,
            entrant_index: entry.entrant_index,
        });
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 4. Settle: oracle submits ranked winners with an Ed25519 signature
    //    over the serialized (arena, end_ts, [(player, score, rank); N])
    //    payload. This ix verifies the sig via an Ed25519Program sysvar
    //    instruction that MUST precede this one in the same tx.
    // ---------------------------------------------------------------------
    pub fn settle_arena(ctx: Context<SettleArena>, payload: SettlePayload) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        let clock = Clock::get()?;
        require!(
            arena.state == ArenaState::Pending || arena.state == ArenaState::Settling,
            ArenaError::ArenaAlreadySettled
        );
        require!(clock.unix_timestamp >= arena.end_ts, ArenaError::ArenaNotEnded);

        verify_oracle_signature(
            &ctx.accounts.ix_sysvar,
            &ctx.accounts.config.scoring_oracle,
            &payload,
            arena.key(),
        )?;

        require!(
            payload.ranked.len() as u8 <= arena.distribution.winner_count,
            ArenaError::ScoreMismatch
        );

        arena.winners = [Pubkey::default(); MAX_WINNERS];
        for (i, ranked) in payload.ranked.iter().enumerate() {
            arena.winners[i] = ranked.player;
        }

        // Pot = entry fees × pot_contribution_bps, accrued in prize_vault balance.
        // Protocol fee taken from pot, transferred to fee vault lazily on first claim.
        let pot_balance = ctx.accounts.prize_vault.lamports();
        let protocol_fee = (pot_balance as u128)
            .checked_mul(ctx.accounts.config.protocol_fee_bps as u128)
            .and_then(|v| v.checked_div(10_000))
            .ok_or(ArenaError::MathOverflow)? as u64;
        arena.total_prize_pot = pot_balance.saturating_sub(protocol_fee);
        arena.protocol_fee_taken = protocol_fee;
        arena.state = ArenaState::Completed;

        emit!(ArenaSettled {
            arena: arena.key(),
            total_prize_pot: arena.total_prize_pot,
            winner_count: payload.ranked.len() as u8,
        });
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 5. Winners claim payouts (one ix per winner — self-serve).
    // ---------------------------------------------------------------------
    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let arena = &ctx.accounts.arena;
        let entry = &mut ctx.accounts.entry;
        require!(arena.state == ArenaState::Completed, ArenaError::ArenaNotEnded);
        require!(!entry.payout_claimed, ArenaError::PayoutAlreadyClaimed);

        let rank = arena
            .winners
            .iter()
            .position(|w| w == &ctx.accounts.player.key())
            .ok_or(ArenaError::NotInPrizePositions)? as u8;
        require!(rank < arena.distribution.winner_count, ArenaError::NotInPrizePositions);

        let bps = arena.distribution.bps[rank as usize] as u128;
        let payout = (arena.total_prize_pot as u128)
            .checked_mul(bps)
            .and_then(|v| v.checked_div(10_000))
            .ok_or(ArenaError::MathOverflow)? as u64;

        // prize_vault is PDA; sign with its seeds.
        let arena_key = arena.key();
        let seeds: &[&[u8]] = &[b"prize_vault", arena_key.as_ref(), &[arena.prize_vault_bump]];
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.prize_vault.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[seeds],
            ),
            payout,
        )?;

        entry.payout_claimed = true;
        entry.final_rank = rank + 1;

        emit!(PayoutClaimed {
            arena: arena.key(),
            player: ctx.accounts.player.key(),
            rank: rank + 1,
            amount_lamports: payout,
        });
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 6. Cancellation: under-subscribed OR safety breaker. Self-serve refund.
    // ---------------------------------------------------------------------
    pub fn cancel_arena(ctx: Context<CancelArena>, reason: u8) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        let clock = Clock::get()?;

        // Admin-forced (reason 1/2) OR under-subscribed past entry window (reason 0).
        let is_admin = ctx.accounts.admin.key() == ctx.accounts.config.admin;
        match reason {
            0 => {
                require!(
                    clock.unix_timestamp >= arena.entry_close_ts
                        && arena.current_entrant_count < arena.min_entrants,
                    ArenaError::Unauthorized
                );
            }
            1 | 2 => require!(is_admin, ArenaError::Unauthorized),
            _ => return err!(ArenaError::Unauthorized),
        }

        arena.state = ArenaState::Cancelled;
        emit!(ArenaCancelled { arena: arena.key(), reason });
        Ok(())
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let arena = &ctx.accounts.arena;
        let entry = &mut ctx.accounts.entry;
        require!(arena.state == ArenaState::Cancelled, ArenaError::ArenaNotEnded);
        require!(!entry.payout_claimed, ArenaError::PayoutAlreadyClaimed);

        let arena_key = arena.key();
        let seeds: &[&[u8]] = &[b"prize_vault", arena_key.as_ref(), &[arena.prize_vault_bump]];
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.prize_vault.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[seeds],
            ),
            entry.deposit_lamports,
        )?;
        entry.payout_claimed = true;
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 7. Spectator wager (optional, phase 3).
    // ---------------------------------------------------------------------
    pub fn place_wager(ctx: Context<PlaceWager>, predicted_winner: Pubkey, amount: u64) -> Result<()> {
        let arena = &ctx.accounts.arena;
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < arena.entry_close_ts, ArenaError::WagerWindowClosed);

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.spectator.to_account_info(),
                    to: ctx.accounts.wager_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let wager = &mut ctx.accounts.wager;
        wager.arena = arena.key();
        wager.spectator = ctx.accounts.spectator.key();
        wager.predicted_winner = predicted_winner;
        wager.amount_lamports = amount;
        wager.placed_ts = clock.unix_timestamp;
        wager.claimed = false;
        wager.bump = ctx.bumps.wager;

        emit!(WagerPlaced {
            arena: wager.arena,
            spectator: wager.spectator,
            predicted_winner,
            amount_lamports: amount,
        });
        Ok(())
    }

    // ---------------------------------------------------------------------
    // 8. Elo update (permissioned to admin cron). Decoupled from settlement
    //    so we can batch many entries into one tx.
    // ---------------------------------------------------------------------
    pub fn update_player_stats(
        ctx: Context<UpdatePlayerStats>,
        delta_rating: i32,
        won_arena: bool,
        winnings_delta_lamports: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            ArenaError::Unauthorized
        );
        let stats = &mut ctx.accounts.stats;
        if stats.arenas_played == 0 && stats.elo_rating == 0 {
            stats.elo_rating = PlayerStats::INITIAL_ELO;
            stats.player = ctx.accounts.player_key.key();
            stats.bump = ctx.bumps.stats;
        }
        stats.elo_rating = (stats.elo_rating as i64 + delta_rating as i64).max(0) as u32;
        stats.arenas_played = stats.arenas_played.saturating_add(1);
        if won_arena {
            stats.arenas_won = stats.arenas_won.saturating_add(1);
        }
        stats.lifetime_pot_winnings_lamports = stats
            .lifetime_pot_winnings_lamports
            .saturating_add(winnings_delta_lamports);
        stats.last_updated_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

// =========================================================================
// Ed25519 signature verification helper.
// Inspects the instruction preceding THIS one in the tx; it must be an
// Ed25519Program instruction that signed exactly this payload with the
// scoring_oracle pubkey.
// =========================================================================
fn verify_oracle_signature(
    ix_sysvar: &AccountInfo,
    expected_signer: &Pubkey,
    payload: &SettlePayload,
    arena: Pubkey,
) -> Result<()> {
    // Load the previous instruction.
    let current_index = ix_sysvar::load_current_index_checked(ix_sysvar)? as usize;
    require!(current_index > 0, ArenaError::InvalidOracleSignature);
    let prev_ix = load_instruction_at_checked(current_index - 1, ix_sysvar)?;
    require!(
        prev_ix.program_id == ed25519_program::ID,
        ArenaError::InvalidOracleSignature
    );

    // Ed25519Program ix layout (single-sig):
    //   [0]        num_signatures (1)
    //   [1]        padding
    //   [2..4]     signature_offset (u16 LE)
    //   [4..6]     signature_instruction_index (u16 LE, 0xFFFF = current)
    //   [6..8]     public_key_offset
    //   [8..10]    public_key_instruction_index
    //   [10..12]   message_data_offset
    //   [12..14]   message_data_size
    //   [14..16]   message_instruction_index
    //   then signature (64) | pubkey (32) | message bytes
    let d = &prev_ix.data;
    require!(d.len() >= 16 + 64 + 32, ArenaError::InvalidOracleSignature);
    let pubkey_offset = u16::from_le_bytes([d[6], d[7]]) as usize;
    let msg_offset = u16::from_le_bytes([d[10], d[11]]) as usize;
    let msg_size = u16::from_le_bytes([d[12], d[13]]) as usize;
    require!(
        d.len() >= pubkey_offset + 32 && d.len() >= msg_offset + msg_size,
        ArenaError::InvalidOracleSignature
    );

    let sig_pubkey = Pubkey::new_from_array(
        d[pubkey_offset..pubkey_offset + 32]
            .try_into()
            .map_err(|_| ArenaError::InvalidOracleSignature)?,
    );
    require!(&sig_pubkey == expected_signer, ArenaError::InvalidOracleSignature);

    // Rebuild the expected message: domain separator || arena || payload.
    let mut expected = Vec::with_capacity(16 + 32 + payload.try_to_vec()?.len());
    expected.extend_from_slice(b"LP_ARENA_SETTLE:");
    expected.extend_from_slice(arena.as_ref());
    expected.extend_from_slice(&payload.try_to_vec()?);

    let signed_msg = &d[msg_offset..msg_offset + msg_size];
    require!(signed_msg == expected.as_slice(), ArenaError::InvalidOracleSignature);
    Ok(())
}

// =========================================================================
// Settlement payload — serialized and signed by the off-chain scorer.
// =========================================================================
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SettlePayload {
    /// Must match arena.end_ts.
    pub end_ts: i64,
    /// Ranked finalists, rank = index (0-based → rank 1 is first).
    /// Length must be <= arena.distribution.winner_count.
    pub ranked: Vec<RankedEntrant>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RankedEntrant {
    pub player: Pubkey,
    /// Score × 1e6 fixed point (e.g. DPR 0.042 → 42_000).
    pub score: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateArenaParams {
    pub pool: Pubkey,
    pub pool_protocol: PoolProtocol,
    pub entry_open_ts: i64,
    pub entry_close_ts: i64,
    pub end_ts: i64,
    pub entry_fee_lamports: u64,
    pub pot_contribution_bps: u16,
    pub min_entrants: u16,
    pub max_entrants: u16,
    pub scoring_metric: ScoringMetric,
    pub safety_gate: SafetyGate,
    pub distribution: PrizeDistribution,
}

// =========================================================================
// Account contexts
// =========================================================================
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = ArenaConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ArenaConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: receives protocol fees; any pubkey OK.
    pub protocol_fee_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateArena<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ArenaConfig>,
    #[account(
        init,
        payer = creator,
        space = Arena::LEN,
        seeds = [b"arena", config.key().as_ref(), &config.arena_count.to_le_bytes()],
        bump
    )]
    pub arena: Account<'info, Arena>,
    /// CHECK: SOL-only vault PDA; no data.
    #[account(
        seeds = [b"prize_vault", arena.key().as_ref()],
        bump
    )]
    pub prize_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EnterArena<'info> {
    #[account(
        mut,
        seeds = [b"arena", arena.config.as_ref(), &arena.index.to_le_bytes()],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    #[account(
        init,
        payer = player,
        space = Entry::LEN,
        seeds = [b"entry", arena.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub entry: Account<'info, Entry>,
    /// CHECK: SOL vault for this arena.
    #[account(mut, seeds = [b"prize_vault", arena.key().as_ref()], bump = arena.prize_vault_bump)]
    pub prize_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleArena<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ArenaConfig>,
    #[account(
        mut,
        seeds = [b"arena", arena.config.as_ref(), &arena.index.to_le_bytes()],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    /// CHECK: SOL vault for pot totals.
    #[account(seeds = [b"prize_vault", arena.key().as_ref()], bump = arena.prize_vault_bump)]
    pub prize_vault: UncheckedAccount<'info>,
    pub cranker: Signer<'info>,
    /// CHECK: the Instructions sysvar.
    #[account(address = ix_sysvar::ID)]
    pub ix_sysvar: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(
        seeds = [b"arena", arena.config.as_ref(), &arena.index.to_le_bytes()],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    #[account(
        mut,
        seeds = [b"entry", arena.key().as_ref(), player.key().as_ref()],
        bump = entry.bump
    )]
    pub entry: Account<'info, Entry>,
    /// CHECK: SOL vault.
    #[account(mut, seeds = [b"prize_vault", arena.key().as_ref()], bump = arena.prize_vault_bump)]
    pub prize_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelArena<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ArenaConfig>,
    #[account(
        mut,
        seeds = [b"arena", arena.config.as_ref(), &arena.index.to_le_bytes()],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(
        seeds = [b"arena", arena.config.as_ref(), &arena.index.to_le_bytes()],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    #[account(
        mut,
        seeds = [b"entry", arena.key().as_ref(), player.key().as_ref()],
        bump = entry.bump,
        has_one = player @ ArenaError::Unauthorized,
    )]
    pub entry: Account<'info, Entry>,
    /// CHECK: SOL vault.
    #[account(mut, seeds = [b"prize_vault", arena.key().as_ref()], bump = arena.prize_vault_bump)]
    pub prize_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceWager<'info> {
    #[account(
        seeds = [b"arena", arena.config.as_ref(), &arena.index.to_le_bytes()],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    #[account(
        init,
        payer = spectator,
        space = Wager::LEN,
        seeds = [b"wager", arena.key().as_ref(), spectator.key().as_ref()],
        bump
    )]
    pub wager: Account<'info, Wager>,
    /// CHECK: SOL-only wager vault PDA.
    #[account(mut, seeds = [b"wager_vault", arena.key().as_ref()], bump)]
    pub wager_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub spectator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(delta_rating: i32, won_arena: bool, winnings_delta_lamports: u64)]
pub struct UpdatePlayerStats<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ArenaConfig>,
    /// CHECK: The player whose stats are being updated — passed by pubkey only.
    pub player_key: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = PlayerStats::LEN,
        seeds = [b"stats", player_key.key().as_ref()],
        bump
    )]
    pub stats: Account<'info, PlayerStats>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}
