// SPDX-License-Identifier: MIT
// Scaffolded from blueprint/things/proposal. Yours from now on.
pragma solidity ^0.8.24;

import {Governance} from "./Governance.sol";

contract MiniDao is Governance {
    mapping(bytes32 => mapping(address => bool)) private _voted;

    constructor(address admin_) Governance(admin_) {}

    // ---- the bodies the blueprint asks for --------------------------------------------------------------------
    function _open(bytes32 proposal, Proposal storage p) internal virtual override {
        if (p.state != State.Absent) revert ProposalExists(proposal);
    }

    function _vote(bytes32 proposal, Proposal storage p, address voter, Choice choice) internal virtual override {
        if (_voted[proposal][voter]) revert AlreadyVoted(proposal);
        _voted[proposal][voter] = true;
        if (choice == Choice.Yes) p.yes += 1;
        else p.no += 1;
    }

    function _close(bytes32, Proposal storage p) internal virtual override returns (bool) {
        return _margin(p) > 0;
    }

    // ---- helpers a developer would plausibly add --------------------------------------------------------------
    /// public view helper: not a declared operation or read.
    function tallyOf(bytes32 proposal) public view returns (uint64 yes, uint64 no) {
        Proposal storage p = _proposals[proposal];
        return (p.yes, p.no);
    }

    /// overload of the helper (same name, other inputs): a name-only classifier cannot tell these apart.
    function tallyOf(bytes32 proposal, address voter) public view returns (bool voted) {
        return _voted[proposal][voter];
    }

    /// overload of a *declared* name with other inputs: must not be mistaken for the declared read `get(bytes32)`.
    function get(bytes32 proposal, bool includeDigest) external view returns (uint64 yes, uint64 no, bytes32 digest) {
        Proposal storage p = _proposals[proposal];
        return (p.yes, p.no, includeDigest ? p.digest : bytes32(0));
    }

    /// internal helper: never in the ABI.
    function _margin(Proposal storage p) internal view returns (int256) {
        return int256(uint256(p.yes)) - int256(uint256(p.no));
    }

    /// UNDECLARED external state-changing function: no role check, no machine, no event. A check must catch this.
    function forceClose(bytes32 proposal) external {
        _proposals[proposal].state = State.Failed;
    }
}
