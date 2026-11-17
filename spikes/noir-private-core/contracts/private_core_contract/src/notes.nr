use aztec::{macros::notes::note, protocol::{address::AztecAddress, traits::Packable}};

#[derive(Eq, Packable)]
#[note]
pub struct ConfigNote {
    pub admin: AztecAddress,
    pub token: AztecAddress,
}

#[derive(Eq, Packable)]
#[note]
pub struct RightNote {
    pub member: AztecAddress,
    pub active: bool,
    pub limit: u128,
    pub spent: u128,
    pub month: u32,
}
