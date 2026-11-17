// Independent check fixture. The builder does not edit these checks.
use aztec::{
    oracle::random::random,
    protocol::address::AztecAddress,
    test::helpers::{test_environment::{CallPrivateOptions, TestEnvironment}, txe_oracles},
};
use private_core_contract::PrivateCore;

pub global JANUARY: u64 = 1894665600; // 2030-01-15T00:00:00Z
pub global MONTH: u32 = 2030 * 12;
pub global LIMIT: u128 = 100;

pub struct Organisation {
    pub env: TestEnvironment,
    pub pool: AztecAddress,
    pub admin: AztecAddress,
    pub member: AztecAddress,
    pub other: AztecAddress,
    pub outsider: AztecAddress,
}

impl Organisation {
    // All callers get the shared pool scope, including the adversarial caller.
    // These checks test authority separately from possession of the pool key.
    pub unconstrained fn grant(self, from: AztecAddress, member: AztecAddress, limit: u128) {
        self.env.call_private_opts(
            from,
            CallPrivateOptions::new().with_additional_scopes([self.pool]),
            PrivateCore::at(self.pool).grant(member, limit),
        );
    }

    pub unconstrained fn revoke(self, from: AztecAddress, member: AztecAddress) {
        self.env.call_private_opts(
            from,
            CallPrivateOptions::new().with_additional_scopes([self.pool]),
            PrivateCore::at(self.pool).revoke(member),
        );
    }

    pub unconstrained fn spend(self, from: AztecAddress, amount: u128) -> u128 {
        self.env.call_private_opts(
            from,
            CallPrivateOptions::new().with_additional_scopes([self.pool]),
            PrivateCore::at(self.pool).spend(self.outsider, amount),
        )
    }

    pub unconstrained fn right(self, member: AztecAddress) -> (bool, u128, u128, u32) {
        self.env.execute_utility(PrivateCore::at(self.pool).read_right(member))
    }
}

pub unconstrained fn organisation() -> Organisation {
    let mut env = TestEnvironment::new();
    let admin = env.create_light_account();
    let member = env.create_light_account();
    let other = env.create_light_account();
    let outsider = env.create_light_account();
    // The pre-transfer checks never call this token address. A successful transfer
    // belongs in the separate network journey using the real Token contract.
    let token = env.create_light_account();
    env.mine_block_at(JANUARY);
    // v5.3.0's with_private_initializer omits additional scopes. Reproduce its
    // deployment with committed initializer arguments, then include the pool
    // scope when executing that initializer so it can initialise pool-owned state.
    let init = PrivateCore::interface().constructor(admin, token);
    let pool = txe_oracles::deploy(
        "@private_core_contract/PrivateCore",
        init.name,
        init.args,
        random(),
        random(),
        AztecAddress::zero(),
        0,
    ).to_address();
    env.call_private_opts(
        admin,
        CallPrivateOptions::new().with_additional_scopes([pool]),
        PrivateCore::at(pool).constructor(admin, token),
    );
    Organisation { env, pool, admin, member, other, outsider }
}

pub unconstrained fn with_member() -> Organisation {
    let p = organisation();
    p.grant(p.admin, p.member, LIMIT);
    p
}
