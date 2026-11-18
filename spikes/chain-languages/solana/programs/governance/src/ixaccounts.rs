// Generated: the account list of every instruction. This IS the client contract on Solana (see IDL).
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeWorkshop<'info> {
    #[account(init, payer = admin, space = 8 + Workshop::INIT_SPACE, seeds = [b"workshop", admin.key().as_ref()], bump)]
    pub workshop: Account<'info, Workshop>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event_cpi]
#[derive(Accounts)]
#[instruction(member_wallet: Pubkey)]
pub struct AddMember<'info> {
    pub workshop: Account<'info, Workshop>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, payer = payer, space = 8 + Member::INIT_SPACE,
        seeds = [b"member", workshop.key().as_ref(), member_wallet.as_ref()], bump)]
    pub member: Account<'info, Member>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct OpenProposal<'info> {
    pub workshop: Account<'info, Workshop>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, payer = payer, space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", workshop.key().as_ref(), &id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}

/// (b) our own AlreadyVoted: init_if_needed, the record says whether it was used.
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Vote<'info> {
    pub workshop: Account<'info, Workshop>,
    pub voter: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: may be absent (then NotAllowed is OUR refusal, not Anchor's AccountNotInitialized); read by `load`.
    #[account(seeds = [b"member", workshop.key().as_ref(), voter.key().as_ref()], bump)]
    pub member: UncheckedAccount<'info>,
    /// CHECK: may be absent (then ProposalNotOpen{absent}); read and written by `load` / `store`.
    #[account(mut, seeds = [b"proposal", workshop.key().as_ref(), &id.to_le_bytes()], bump)]
    pub proposal: UncheckedAccount<'info>,
    #[account(init_if_needed, payer = payer, space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()], bump)]
    pub vote_record: Account<'info, VoteRecord>,
    /// CHECK: Q2. Only passed when the workshop is gated by a third-party token (Option => `optional` in the IDL).
    pub gate_token: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info, System>,
}

/// (a) `init`: the second vote fails inside the System Program ("account already in use"), not with our code.
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct VoteInit<'info> {
    pub workshop: Account<'info, Workshop>,
    pub voter: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: see Vote
    #[account(seeds = [b"member", workshop.key().as_ref(), voter.key().as_ref()], bump)]
    pub member: UncheckedAccount<'info>,
    /// CHECK: see Vote
    #[account(mut, seeds = [b"proposal", workshop.key().as_ref(), &id.to_le_bytes()], bump)]
    pub proposal: UncheckedAccount<'info>,
    #[account(init, payer = payer, space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()], bump)]
    pub vote_record: Account<'info, VoteRecord>,
    /// CHECK: see Vote
    pub gate_token: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct AdminOnProposal<'info> {
    pub workshop: Account<'info, Workshop>,
    pub admin: Signer<'info>,
    /// CHECK: may be absent; see Vote
    #[account(mut, seeds = [b"proposal", workshop.key().as_ref(), &id.to_le_bytes()], bump)]
    pub proposal: UncheckedAccount<'info>,
}

/// Reads need no signer. `workshop` is only here so the PDA can be derived and checked.
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct ReadProposal<'info> {
    pub workshop: Account<'info, Workshop>,
    /// CHECK: may be absent; see Vote
    #[account(seeds = [b"proposal", workshop.key().as_ref(), &id.to_le_bytes()], bump)]
    pub proposal: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Noisy<'info> {
    pub who: Signer<'info>,
}

#[derive(Accounts)]
pub struct GateTransfer<'info> {
    /// CHECK: owned by the SPL Token program; it checks the rest
    #[account(mut)]
    pub from: UncheckedAccount<'info>,
    /// CHECK: see from
    #[account(mut)]
    pub to: UncheckedAccount<'info>,
    pub owner: Signer<'info>,
    /// CHECK: pinned by address; the IDL carries this constant, so clients never pass it
    #[account(address = crate::util::SPL_TOKEN)]
    pub token_program: UncheckedAccount<'info>,
}
