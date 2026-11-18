// Generated from blueprint/things/proposal/machine.ts: open (creates, -> open), vote (open -> open),
// close (open -> passed | failed). The machine only looks at the state byte. Do not edit.
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn check_open(state: u8) -> Result<()> {
    if state == ABSENT { Ok(()) } else { Err(E::ProposalExists.into()) }
}
pub fn check_vote(state: u8) -> Result<()> {
    if state == OPEN { Ok(()) } else { Err(refuse_not_open(state)) }
}
pub fn check_close(state: u8) -> Result<()> {
    if state == OPEN { Ok(()) } else { Err(refuse_not_open(state)) }
}
