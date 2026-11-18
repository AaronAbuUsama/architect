// Q5: how Anchor numbers #[error_code] variants. Host-only crate: prints the numbers, nothing runs on chain.
use anchor_lang::prelude::*;

macro_rules! numbers { ($m:ident: $($v:ident),*) => { vec![$((stringify!($v), u32::from($m::E::$v))),*] } }

mod v1_positional { use super::*; #[error_code] pub enum E { AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed } }
mod v2_reordered { use super::*; #[error_code] pub enum E { ProposalExists, AlreadyVoted, ProposalNotOpen, NotAllowed } }
mod v3_inserted_first { use super::*; #[error_code] pub enum E { Brand, AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed } }
mod v4_explicit { use super::*; #[error_code] pub enum E { AlreadyVoted = 1, ProposalExists = 2, ProposalNotOpen = 900, NotAllowed = 1001 } }
mod v5_explicit_reordered { use super::*; #[error_code] pub enum E { NotAllowed = 1001, ProposalNotOpen = 900, ProposalExists = 2, Brand = 7, AlreadyVoted = 1 } }
mod v6_offset0_explicit { use super::*; #[error_code(offset = 0)] pub enum E { AlreadyVoted = 1, ProposalExists = 2, ProposalNotOpen = 900, NotAllowed = 1001 } }
mod v7_renamed { use super::*; #[error_code] pub enum E { AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed } }

#[cfg(test)]
mod t {
    use super::*;
    #[test]
    fn print_numbers() {
        let rows: Vec<(&str, Vec<(&str, u32)>)> = vec![
            ("v1_positional (declaration order)", numbers!(v1_positional: AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed)),
            ("v2_reordered (first two swapped)", numbers!(v2_reordered: ProposalExists, AlreadyVoted, ProposalNotOpen, NotAllowed)),
            ("v3_inserted_first (new variant at top)", numbers!(v3_inserted_first: Brand, AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed)),
            ("v4_explicit (= 1, 2, 900, 1001; default offset 6000)", numbers!(v4_explicit: AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed)),
            ("v5_explicit_reordered + Brand inserted", numbers!(v5_explicit_reordered: NotAllowed, ProposalNotOpen, ProposalExists, Brand, AlreadyVoted)),
            ("v6_offset0_explicit (offset = 0)", numbers!(v6_offset0_explicit: AlreadyVoted, ProposalExists, ProposalNotOpen, NotAllowed)),
        ];
        for (name, r) in rows { println!("{name}\n  {r:?}"); }
        let _ = v7_renamed::E::AlreadyVoted;
        // what the runtime sees: Error -> custom program error number
        let e: Error = v4_explicit::E::ProposalNotOpen.into();
        if let Error::AnchorError(a) = e { println!("Error::AnchorError code={} name={} msg={}", a.error_code_number, a.error_name, a.error_msg); }
    }
}
