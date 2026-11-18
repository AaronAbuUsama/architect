// Written by the developer (scaffolded once). The wrappers in lib.rs call these after role and machine checks.
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

/// A plain pub helper. Rust `pub fn`s never reach the IDL: the surface is whatever `#[program]` lists.
pub fn tally_passed(yes: u32, no: u32) -> bool {
    yes > no
}

pub fn open_body(p: &mut Proposal, digest: [u8; 32]) {
    p.digest = digest;
    p.yes = 0;
    p.no = 0;
}

/// (b) our own AlreadyVoted: the record may already exist (init_if_needed) and says so.
pub fn vote_body(p: &mut Proposal, r: &mut VoteRecord, choice: Choice) -> Result<()> {
    if r.voted {
        return Err(E::AlreadyVoted.into());
    }
    r.voted = true;
    r.choice = if choice == Choice::Yes { 1 } else { 2 };
    if choice == Choice::Yes { p.yes += 1 } else { p.no += 1 }
    Ok(())
}

pub fn close_body(p: &Proposal) -> bool {
    tally_passed(p.yes, p.no)
}
