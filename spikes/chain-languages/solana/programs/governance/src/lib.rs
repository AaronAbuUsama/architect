// Generated shape: one entry per declared operation, each = role check -> machine check -> developer body -> event.
// Written by hand in this spike, in the shape a generator would emit. Everything else is the developer's.
use anchor_lang::prelude::*;

mod ixaccounts; // not `accounts`: #[program] generates a module of that name
mod body;
mod errors;
mod machine;
mod state;
mod util;

use ixaccounts::*;
use errors::*;
use state::*;
use util::*;

declare_id!("BYXxwh4GCU78XMJYNVmNbj7RiRqWuUoyrAgKL2wz9F8s");

#[program]
pub mod governance {
    use super::*;

    /// Lifecycle (the EVM constructor): not an operation, but Solana needs something to create the config account.
    pub fn initialize_workshop(ctx: Context<InitializeWorkshop>, gate_mint: Pubkey) -> Result<()> {
        let w = &mut ctx.accounts.workshop;
        w.admin = ctx.accounts.admin.key();
        w.gate_mint = gate_mint;
        w.bump = ctx.bumps.workshop;
        Ok(())
    }

    /// member.add { member } allowed: [admin]. Existing member = no-op success (reference machine).
    pub fn add_member(ctx: Context<AddMember>, member_wallet: Pubkey) -> Result<()> {
        if ctx.accounts.admin.key() != ctx.accounts.workshop.admin {
            return Err(E::NotAllowed.into());
        }
        let m = &mut ctx.accounts.member;
        m.workshop = ctx.accounts.workshop.key();
        m.wallet = member_wallet;
        m.bump = ctx.bumps.member;
        emit_cpi!(MemberAdded { workshop: m.workshop, member: member_wallet });
        Ok(())
    }

    /// proposal.open { proposal, digest } allowed: [admin] move: open emits ProposalOpened
    pub fn open_proposal(ctx: Context<OpenProposal>, id: u64, digest: [u8; 32]) -> Result<()> {
        if ctx.accounts.admin.key() != ctx.accounts.workshop.admin {
            return Err(E::NotAllowed.into()); // role
        }
        machine::check_open(ctx.accounts.proposal.state)?; // machine
        let p = &mut ctx.accounts.proposal;
        p.workshop = ctx.accounts.workshop.key();
        p.id = id;
        p.state = OPEN;
        p.bump = ctx.bumps.proposal;
        body::open_body(p, digest); // developer body
        emit!(ProposalOpened { workshop: p.workshop, proposal: id, digest });
        Ok(())
    }

    /// proposal.vote { proposal, choice } allowed: [member] move: vote emits VoteCast. VoteRecord via init_if_needed.
    pub fn vote(mut ctx: Context<Vote>, id: u64, choice: Choice) -> Result<()> {
        let a = &mut ctx.accounts;
        let (pid, vr_bump) = (ctx.program_id, ctx.bumps.vote_record);
        do_vote(pid, &a.workshop, a.voter.key(), &a.member, a.gate_token.as_ref().map(|g| g.as_ref()), &a.proposal,
            &mut a.vote_record, vr_bump, id, choice)
    }

    /// Variant (a): the same operation with an `init` VoteRecord: the second vote is a System Program failure.
    pub fn vote_init(mut ctx: Context<VoteInit>, id: u64, choice: Choice) -> Result<()> {
        let a = &mut ctx.accounts;
        let (pid, vr_bump) = (ctx.program_id, ctx.bumps.vote_record);
        do_vote(pid, &a.workshop, a.voter.key(), &a.member, a.gate_token.as_ref().map(|g| g.as_ref()), &a.proposal,
            &mut a.vote_record, vr_bump, id, choice)
    }

    /// proposal.close { proposal } allowed: [admin] move: close emits ProposalClosed
    pub fn close_proposal(ctx: Context<AdminOnProposal>, id: u64) -> Result<()> {
        if ctx.accounts.admin.key() != ctx.accounts.workshop.admin {
            return Err(E::NotAllowed.into());
        }
        let info = ctx.accounts.proposal.as_ref();
        let loaded: Option<Proposal> = load(info, ctx.program_id);
        machine::check_close(loaded.as_ref().map_or(ABSENT, |p| p.state))?;
        let mut p = loaded.unwrap();
        let passed = body::close_body(&p);
        p.state = if passed { PASSED } else { FAILED };
        store(info, &p)?;
        emit!(ProposalClosed { workshop: p.workshop, proposal: id, passed });
        Ok(())
    }

    /// proposal.get { proposal } -> { digest, yes, no, state }: the DECLARED read, as a view instruction (return data).
    pub fn get_proposal(ctx: Context<ReadProposal>, _id: u64) -> Result<ProposalView> {
        let p: Option<Proposal> = load(ctx.accounts.proposal.as_ref(), ctx.program_id);
        Ok(p.map_or(ProposalView { digest: [0; 32], yes: 0, no: 0, state: ABSENT }, |p| ProposalView {
            digest: p.digest, yes: p.yes, no: p.no, state: p.state,
        }))
    }

    /// HELPER the developer added: a view-like instruction outside the declared surface.
    pub fn preview_outcome(ctx: Context<ReadProposal>, _id: u64) -> Result<bool> {
        let p: Option<Proposal> = load(ctx.accounts.proposal.as_ref(), ctx.program_id);
        Ok(p.map_or(false, |p| body::tally_passed(p.yes, p.no)))
    }

    /// UNDECLARED state-changing instruction the developer slipped in: admin-only, but not an operation.
    pub fn reset_tally(ctx: Context<AdminOnProposal>, _id: u64) -> Result<()> {
        if ctx.accounts.admin.key() != ctx.accounts.workshop.admin {
            return Err(E::NotAllowed.into());
        }
        let info = ctx.accounts.proposal.as_ref();
        let mut p: Proposal = load(info, ctx.program_id).ok_or(E::NotAllowed)?;
        p.yes = 0;
        p.no = 0;
        store(info, &p)
    }

    /// Q2: a CPI into someone else's program (SPL Token Transfer). When it fails, the error number is THEIR error, not ours.
    pub fn gate_transfer(ctx: Context<GateTransfer>, amount: u64) -> Result<()> {
        use anchor_lang::solana_program::{instruction::{AccountMeta, Instruction}, program::invoke};
        let a = &ctx.accounts;
        let ix = Instruction {
            program_id: SPL_TOKEN,
            accounts: vec![AccountMeta::new(a.from.key(), false), AccountMeta::new(a.to.key(), false), AccountMeta::new_readonly(a.owner.key(), true)],
            data: [&[3u8][..], &amount.to_le_bytes()].concat(), // SPL Token instruction 3 = Transfer
        };
        invoke(&ix, &[a.from.to_account_info(), a.to.to_account_info(), a.owner.to_account_info(), a.token_program.to_account_info()])?;
        Ok(())
    }

    /// Spike-only: fills the log to show truncation (Q6). Undeclared.
    pub fn noisy(ctx: Context<Noisy>, n: u32, width: u32) -> Result<()> {
        for _ in 0..n {
            msg!("{}", "x".repeat(width as usize));
        }
        emit!(ProposalOpened { workshop: ctx.accounts.who.key(), proposal: 0, digest: [7; 32] });
        Ok(())
    }
}

/// The shared body of `vote` / `vote_init`: role -> machine -> body -> event.
#[allow(clippy::too_many_arguments)]
fn do_vote<'info>(
    program_id: &Pubkey, workshop: &Account<'info, Workshop>, voter: Pubkey, member: &UncheckedAccount<'info>,
    gate: Option<&AccountInfo<'info>>, proposal: &UncheckedAccount<'info>, record: &mut Account<'info, VoteRecord>,
    record_bump: u8, id: u64, choice: Choice,
) -> Result<()> {
    // role: a Member PDA exists (and, if the workshop is gated, the voter holds one unit of the gate token)
    if load::<Member>(member.as_ref(), program_id).is_none() {
        return Err(E::NotAllowed.into());
    }
    if workshop.gate_mint != Pubkey::default() && !gate.is_some_and(|g| holds_one(g, &workshop.gate_mint, &voter)) {
        return Err(E::NotAllowed.into());
    }
    // machine
    let info = proposal.as_ref();
    let loaded: Option<Proposal> = load(info, program_id);
    machine::check_vote(loaded.as_ref().map_or(ABSENT, |p| p.state))?;
    let mut p = loaded.unwrap();
    // body (the record is ours to fill in: it may be brand new)
    record.proposal = proposal.key();
    record.member = voter;
    record.bump = record_bump;
    body::vote_body(&mut p, record, choice)?;
    store(info, &p)?;
    emit!(VoteCast { workshop: workshop.key(), proposal: id, choice, yes: p.yes, no: p.no });
    Ok(())
}
