// Independently authored conformance checks. No token substitute is used.
use super::fixture::{organisation, with_member, LIMIT, MONTH};

#[test]
unconstrained fn admin_grants_a_private_member_right() {
    let p = with_member();
    assert_eq(p.right(p.member), (true, LIMIT, 0, MONTH));
}

#[test]
unconstrained fn each_member_has_their_own_limit() {
    let p = with_member();
    p.grant(p.admin, p.other, 37);
    assert_eq(p.right(p.member), (true, LIMIT, 0, MONTH));
    assert_eq(p.right(p.other), (true, 37, 0, MONTH));
}

#[test(should_fail_with = "[PC-020] AllowanceNotAdmin")]
unconstrained fn shared_key_member_cannot_grant_a_right() {
    let p = with_member();
    p.grant(p.member, p.outsider, LIMIT);
}

#[test(should_fail_with = "[PC-020] AllowanceNotAdmin")]
unconstrained fn shared_key_member_cannot_change_their_limit() {
    let p = with_member();
    p.grant(p.member, p.member, LIMIT + 1);
}

#[test(should_fail_with = "[PC-020] AllowanceNotAdmin")]
unconstrained fn shared_key_member_cannot_revoke_another_member() {
    let p = with_member();
    p.grant(p.admin, p.other, 37);
    p.revoke(p.member, p.other);
}

#[test(should_fail_with = "[PC-020] AllowanceNotAdmin")]
unconstrained fn shared_key_member_cannot_revoke_themselves() {
    let p = with_member();
    p.revoke(p.member, p.member);
}

#[test(should_fail_with = "[PC-020] AllowanceNotAdmin")]
unconstrained fn shared_key_non_member_cannot_grant() {
    let p = with_member();
    p.grant(p.outsider, p.outsider, LIMIT);
}

#[test]
unconstrained fn admin_consumes_the_members_active_right() {
    let p = with_member();
    p.revoke(p.admin, p.member);
    assert_eq(p.right(p.member).0, false);
}

#[test]
unconstrained fn revoke_leaves_other_members_right_unchanged() {
    let p = with_member();
    p.grant(p.admin, p.other, 37);
    p.revoke(p.admin, p.member);
    assert_eq(p.right(p.other), (true, 37, 0, MONTH));
}

#[test(should_fail_with = "[PC-010] AllowanceExceeded { remaining: 100 }")]
unconstrained fn spend_over_own_limit_refuses_before_token_call() {
    let p = with_member();
    let _ = p.spend(p.member, LIMIT + 1);
}

#[test(should_fail_with = "[PC-010] AllowanceExceeded { remaining: 37 }")]
unconstrained fn another_members_larger_limit_does_not_authorise_spend() {
    let p = with_member();
    p.grant(p.admin, p.other, 37);
    let _ = p.spend(p.other, 38);
}

#[test(should_fail_with = "[PC-021] AllowanceNotMember")]
unconstrained fn non_member_with_shared_key_cannot_spend() {
    let p = with_member();
    let _ = p.spend(p.outsider, 1);
}

#[test(should_fail_with = "[PC-021] AllowanceNotMember")]
unconstrained fn ungranted_admin_cannot_spend() {
    let p = with_member();
    let _ = p.spend(p.admin, 1);
}

#[test(should_fail_with = "[PC-021] AllowanceNotMember")]
unconstrained fn revoked_member_cannot_spend_even_with_shared_key() {
    let p = with_member();
    p.revoke(p.admin, p.member);
    let _ = p.spend(p.member, 1);
}

#[test(should_fail)]
unconstrained fn a_duplicate_grant_cannot_create_a_second_active_right() {
    let p = with_member();
    p.grant(p.admin, p.member, LIMIT);
}

#[test]
unconstrained fn an_ungranted_member_has_no_active_right() {
    let p = organisation();
    assert_eq(p.right(p.member).0, false);
}
