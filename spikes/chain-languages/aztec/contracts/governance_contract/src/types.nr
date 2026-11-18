use aztec::{macros::notes::note, protocol::{address::AztecAddress, traits::{Deserialize, Packable, Serialize}}};

pub global OPEN: u8 = 1;
pub global CLOSED_PASSED: u8 = 2;
pub global CLOSED_FAILED: u8 = 3;

// state 0 = absent (never opened).
#[derive(Eq, Packable, Serialize, Deserialize)]
pub struct Proposal {
    pub state: u8,
    pub digest: Field,
    pub yes: u32,
    pub no: u32,
}

#[derive(Eq, Packable)]
#[note]
pub struct MemberNote {
    pub member: AztecAddress,
}
