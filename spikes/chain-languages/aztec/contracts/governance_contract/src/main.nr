// Spike: the mini DAO of ../spec.md, shaped as a generator would emit it.
// Built on the stock PrivateVoting (SingleUseClaim + enqueued public tally). Refusal codes ride in assert messages.
use aztec::macros::aztec;

pub mod types;

#[aztec]
pub contract Governance {
    use crate::types::{MemberNote, Proposal, CLOSED_FAILED, CLOSED_PASSED, OPEN};
    use aztec::{
        macros::{
            events::event,
            functions::{external, initializer, internal, only_self, view},
            storage::storage,
        },
        messages::delivery::MessageDelivery,
        note::note_getter_options::NoteGetterOptions,
        protocol::address::AztecAddress,
        state_vars::{Map, Owned, PrivateSet, PublicImmutable, PublicMutable, SingleUseClaim},
    };

    // Public logs (plaintext, like Solidity events). VoteCast has no voter in it.
    #[event]
    struct ProposalOpened { proposal: Field, digest: Field }
    #[event]
    struct VoteCast { proposal: Field, choice: bool, yes: u32, no: u32 }
    #[event]
    struct ProposalClosed { proposal: Field, passed: bool }

    #[storage]
    struct Storage<Context> {
        admin: PublicImmutable<AztecAddress, Context>,
        proposals: Map<Field, PublicMutable<Proposal, Context>, Context>,
        // Private: one MemberNote per add_member, owned (readable, spendable) only by the member.
        members: Owned<PrivateSet<MemberNote, Context>, Context>,
        // Private: proposal => member => the one-use claim (a nullifier keyed by the member's secret).
        vote_claims: Map<Field, Owned<SingleUseClaim<Context>, Context>, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(admin: AztecAddress) {
        self.storage.admin.initialize(admin);
    }

    // ---- declared operations -------------------------------------------------------------------------------

    #[external("public")]
    fn open_proposal(proposal: Field, digest: Field) {
        self.internal._assert_admin(self.msg_sender());
        let current = self.storage.proposals.at(proposal).read();
        assert(current.state == 0, "[PR-002] ProposalExists");
        self.storage.proposals.at(proposal).write(Proposal { state: OPEN, digest, yes: 0, no: 0 });
        self.emit(ProposalOpened { proposal, digest });
    }

    #[external("public")]
    fn close_proposal(proposal: Field) {
        self.internal._assert_admin(self.msg_sender());
        let mut p = self.storage.proposals.at(proposal).read();
        let state = p.state;
        assert(state == OPEN, f"[PR-900] ProposalNotOpen {{ state: {state} }}");
        p.state = if p.yes > p.no { CLOSED_PASSED } else { CLOSED_FAILED };
        self.storage.proposals.at(proposal).write(p);
        self.emit(ProposalClosed { proposal, passed: p.state == CLOSED_PASSED });
    }

    #[external("private")]
    fn add_member(member: AztecAddress) {
        let admin = self.storage.admin.read();
        assert(admin == self.msg_sender(), "[AR-001] NotAllowed");
        self.storage.members.at(member).insert(MemberNote { member })
            .deliver_to(member, MessageDelivery::onchain_unconstrained());
    }

    #[external("private")]
    fn vote(proposal: Field, choice: bool) {
        let voter = self.msg_sender();
        let mine = self.storage.members.at(voter).get_notes(NoteGetterOptions::new().set_limit(1));
        assert(mine.len() == 1, "[AR-001] NotAllowed");
        // One use per (proposal, voter secret). A second vote repeats this nullifier: the node refuses it.
        self.storage.vote_claims.at(proposal).at(voter).claim();
        self.enqueue_self._tally(proposal, choice);
    }

    #[external("public")]
    #[view]
    fn get(proposal: Field) -> Proposal {
        self.storage.proposals.at(proposal).read()
    }

    // ---- what the surface hides or must not expose ------------------------------------------------------

    // Reached only through vote's enqueue; only_self keeps it off the outside surface.
    #[external("public")]
    #[only_self]
    fn _tally(proposal: Field, choice: bool) {
        let mut p = self.storage.proposals.at(proposal).read();
        let state = p.state;
        assert(state == OPEN, f"[PR-900] ProposalNotOpen {{ state: {state} }}");
        if choice { p.yes += 1; } else { p.no += 1; }
        self.storage.proposals.at(proposal).write(p);
        self.emit(VoteCast { proposal, choice, yes: p.yes, no: p.no });
    }

    // Developer helper (internal: inlined into callers, not in the artifact's callable surface).
    #[internal("public")]
    fn _assert_admin(who: AztecAddress) {
        assert(self.storage.admin.read() == who, "[AR-001] NotAllowed");
    }

    // Developer helper (extra utility view, device-local): a client can pre-check membership and the claim.
    #[external("utility")]
    unconstrained fn is_member(who: AztecAddress) -> bool {
        self.storage.members.at(who).view_notes(aztec::note::note_viewer_options::NoteViewerOptions::new()).len() > 0
    }

    #[external("utility")]
    unconstrained fn has_voted(proposal: Field, who: AztecAddress) -> bool {
        self.storage.vote_claims.at(proposal).at(who).has_claimed()
    }

    // Undeclared on purpose: a state-changing public function the blueprint never mentions.
    #[external("public")]
    fn rewrite_digest(proposal: Field, digest: Field) {
        self.internal._assert_admin(self.msg_sender());
        let mut p = self.storage.proposals.at(proposal).read();
        p.digest = digest;
        self.storage.proposals.at(proposal).write(p);
    }
}
