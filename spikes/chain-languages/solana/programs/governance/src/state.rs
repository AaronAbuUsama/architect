// Generated from the blueprint (things, fields, events). Do not edit.
use anchor_lang::prelude::*;

pub const ABSENT: u8 = 0;
pub const OPEN: u8 = 1;
pub const PASSED: u8 = 2;
pub const FAILED: u8 = 3;

/// The per-workshop config: who is admin, and (Q2) an optional third-party token whose holders may vote.
#[account]
#[derive(InitSpace)]
pub struct Workshop {
    pub admin: Pubkey,
    pub gate_mint: Pubkey, // default (all zero) = no gate
    pub bump: u8,
}

/// Exists <=> `wallet` is a member of `workshop`.
#[account]
#[derive(InitSpace)]
pub struct Member {
    pub workshop: Pubkey,
    pub wallet: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub workshop: Pubkey,
    pub id: u64, // ProposalId is a u64 here: it is a PDA seed, 8 bytes is natural on Solana
    pub digest: [u8; 32],
    pub yes: u32,
    pub no: u32,
    pub state: u8,
    pub bump: u8,
}

/// One-vote record: its existence (or `voted`) is the "already voted" fact.
#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub proposal: Pubkey,
    pub member: Pubkey,
    pub voted: bool,
    pub choice: u8, // 1 = yes, 2 = no
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Choice {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ProposalView {
    pub digest: [u8; 32],
    pub yes: u32,
    pub no: u32,
    pub state: u8,
}

#[event]
pub struct ProposalOpened {
    pub workshop: Pubkey,
    pub proposal: u64,
    pub digest: [u8; 32],
}
#[event]
pub struct VoteCast {
    pub workshop: Pubkey,
    pub proposal: u64,
    pub choice: Choice,
    pub yes: u32,
    pub no: u32,
}
#[event]
pub struct ProposalClosed {
    pub workshop: Pubkey,
    pub proposal: u64,
    pub passed: bool,
}
#[event]
pub struct MemberAdded {
    pub workshop: Pubkey,
    pub member: Pubkey,
}
