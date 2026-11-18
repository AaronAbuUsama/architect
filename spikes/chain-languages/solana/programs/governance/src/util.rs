// Generated support: read/write an account that may be absent without Anchor's own (code-less) failures.
use anchor_lang::prelude::*;

pub const SPL_TOKEN: Pubkey = Pubkey::from_str_const("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/// None when the account is not ours / empty / wrong type: the caller turns that into OUR refusal.
pub fn load<T: AccountDeserialize>(info: &AccountInfo, program_id: &Pubkey) -> Option<T> {
    if info.owner != program_id || info.data_is_empty() {
        return None;
    }
    T::try_deserialize(&mut &info.data.borrow()[..]).ok()
}

pub fn store<T: AccountSerialize>(info: &AccountInfo, v: &T) -> Result<()> {
    v.try_serialize(&mut &mut info.data.borrow_mut()[..])
}

/// Q2(b): the third-party program's account is read, never trusted: owner program, mint, owner, amount >= 1.
pub fn holds_one(token: &AccountInfo, mint: &Pubkey, holder: &Pubkey) -> bool {
    if token.owner != &SPL_TOKEN {
        return false;
    }
    let d = token.data.borrow();
    d.len() >= 72
        && d[0..32] == mint.to_bytes()
        && d[32..64] == holder.to_bytes()
        && u64::from_le_bytes(d[64..72].try_into().unwrap()) >= 1
}
