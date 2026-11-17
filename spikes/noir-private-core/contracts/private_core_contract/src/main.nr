// Throwaway private core. Shared read/nullifier keys do not confer caller authority.
pub mod calendar;
pub mod notes;
use aztec::macros::aztec;

#[aztec]
pub contract PrivateCore {
    use crate::{calendar::month_index, notes::{ConfigNote, RightNote}};
    use aztec::{
        macros::{functions::{external, initializer}, storage::storage},
        messages::delivery::MessageDelivery,
        protocol::{address::AztecAddress, abis::function_selector::FunctionSelector, traits::ToField},
        state_vars::{Map, Owned, PrivateImmutable, PrivateMutable},
    };

    #[storage]
    struct Storage<Context> {
        config: Owned<PrivateImmutable<ConfigNote, Context>, Context>,
        rights: Map<Field, Owned<PrivateMutable<RightNote, Context>, Context>, Context>,
    }

    #[contract_library_method]
    fn quiet(pool: AztecAddress) -> aztec::messages::delivery::OnchainUnconstrainedDelivery {
        MessageDelivery::onchain_unconstrained().with_sender(pool).via_address_derived_secret()
    }

    #[external("private")]
    #[initializer]
    fn constructor(admin: AztecAddress, token: AztecAddress) {
        assert(admin == self.msg_sender(), "[PC-020] AllowanceNotAdmin {}");
        self.storage.config.at(self.address).initialize(ConfigNote { admin, token })
            .deliver_to(self.address, quiet(self.address));
    }

    #[external("private")]
    fn grant(member: AztecAddress, limit: u128) {
        let config = self.storage.config.at(self.address).get_note();
        assert(config.admin == self.msg_sender(), "[PC-020] AllowanceNotAdmin {}");
        let month = month_index(self.context.get_anchor_block_header().global_variables.timestamp);
        self.storage.rights.at(member.to_field()).at(self.address)
            .initialize(RightNote { member, active: true, limit, spent: 0, month })
            .deliver_to(self.address, quiet(self.address));
    }

    #[external("private")]
    fn revoke(member: AztecAddress) {
        let config = self.storage.config.at(self.address).get_note();
        assert(config.admin == self.msg_sender(), "[PC-020] AllowanceNotAdmin {}");
        // Replaces the live right with a tombstone, consuming the exact note a
        // concurrent spend needs. No public flag and no delayed public read.
        self.storage.rights.at(member.to_field()).at(self.address).replace(|mut right: RightNote| {
            assert(right.member == member, "[PC-021] AllowanceNotMember {}");
            assert(right.active, "[PC-021] AllowanceNotMember {}");
            right.active = false;
            right
        }).deliver_to(self.address, quiet(self.address));
    }

    #[external("private")]
    fn spend(to: AztecAddress, amount: u128) -> u128 {
        let member = self.msg_sender();
        let pool = self.address;
        let config = self.storage.config.at(pool).get_note();
        let month = month_index(self.context.get_anchor_block_header().global_variables.timestamp);
        let next = self.storage.rights.at(member.to_field()).at(pool)
            .initialize_or_replace(|previous: Option<RightNote>| {
                // Absence is a refusal, never authority. A malicious oracle
                // cannot invent an existing note or bypass its nullifier.
                assert(previous.is_some(), "[PC-021] AllowanceNotMember {}");
                let mut right = previous.unwrap_unchecked();
                assert(right.active & (right.member == member), "[PC-021] AllowanceNotMember {}");
                assert(month >= right.month, "[PC-022] AnchorMonthRegression {}");
                if month > right.month {
                    right.month = month;
                    right.spent = 0;
                }
                let remaining = right.limit - right.spent;
                assert(amount <= remaining, f"[PC-010] AllowanceExceeded {{ remaining: {remaining} }}");
                right.spent += amount;
                right
            });
        let remaining = next.get_note().limit - next.get_note().spent;
        next.deliver_to(pool, quiet(pool));
        let transfer = FunctionSelector::from_signature("transfer_in_private((Field),(Field),u128,Field)");
        let _ = self.context.call_private_function(config.token, transfer, [pool.to_field(), to.to_field(), amount as Field, 0]);
        remaining
    }

    #[external("utility")]
    unconstrained fn read_right(member: AztecAddress) -> pub (bool, u128, u128, u32) {
        let slot = self.storage.rights.at(member.to_field()).at(self.address);
        if !slot.is_initialized() { (false, 0, 0, 0) } else {
            let right = slot.view_note();
            (right.active, right.limit, right.spent, right.month)
        }
    }
}
