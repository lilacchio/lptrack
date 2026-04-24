use anchor_lang::prelude::*;

#[error_code]
pub enum ArenaError {
    #[msg("Arena is not currently accepting entries")]
    ArenaNotOpen,
    #[msg("Arena entry window has closed")]
    EntryWindowClosed,
    #[msg("Arena has not yet started")]
    ArenaNotStarted,
    #[msg("Arena has not yet ended")]
    ArenaNotEnded,
    #[msg("Arena already settled")]
    ArenaAlreadySettled,
    #[msg("Arena reached max entrants")]
    ArenaFull,
    #[msg("Below minimum entrants — arena cancelled, refund available")]
    BelowMinEntrants,
    #[msg("Duplicate entry — one entry per wallet per arena")]
    DuplicateEntry,
    #[msg("Entry fee below required amount")]
    EntryFeeTooLow,
    #[msg("Invalid oracle signature on scoring results")]
    InvalidOracleSignature,
    #[msg("Score submission does not match registered entrants")]
    ScoreMismatch,
    #[msg("Payout already claimed")]
    PayoutAlreadyClaimed,
    #[msg("Wallet did not place in prize positions")]
    NotInPrizePositions,
    #[msg("Safety circuit breaker tripped — arena cancelled")]
    SafetyBreakerTripped,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Unauthorized: admin only")]
    Unauthorized,
    #[msg("Invalid distribution — bps must sum to <= 10000")]
    InvalidDistribution,
    #[msg("Wager window closed — arena already started")]
    WagerWindowClosed,
}
