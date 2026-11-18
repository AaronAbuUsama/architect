// Generated from blueprint/things/proposal/errors.ts and the runtime. Do not edit.
// Explicit discriminants: the number on chain is 6000 + discriminant, so it never moves with declaration order.
// Block 1..899 = declared errors per code prefix PR; 900 = machine; 1001.. = runtime (AR). See README finding 12.
use anchor_lang::prelude::*;

#[error_code]
pub enum E {
    #[msg("PR-001 AlreadyVoted")]
    AlreadyVoted = 1,
    #[msg("PR-002 ProposalExists")]
    ProposalExists = 2,
    #[msg("PR-900 ProposalNotOpen")]
    ProposalNotOpen = 900,
    #[msg("AR-001 NotAllowed")]
    NotAllowed = 1001,
}

/// State byte carried by `ProposalNotOpen` (0 = absent). Travels as a log line and as return data.
pub fn refuse_not_open(state: u8) -> Error {
    msg!("refusal PR-900 ProposalNotOpen state={}", state);
    anchor_lang::solana_program::program::set_return_data(&[state]);
    E::ProposalNotOpen.into()
}
