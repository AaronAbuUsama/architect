// SPDX-License-Identifier: MIT
// Q2(b): voting requires holding at least one unit of someone else's token. Our contract calls theirs.
pragma solidity ^0.8.24;

import {MiniDao} from "./MiniDao.sol";

interface IBalanceOf {
    function balanceOf(address owner) external view returns (uint256);
}

contract GatedDao is MiniDao {
    error NoToken(address token, address voter); // a new refusal the blueprint would have to declare
    error GateCallFailed(address token, bytes reason); // our own wrapper of "their revert"

    IBalanceOf public immutable gate;
    bool public immutable wrap; // false: their revert bubbles up unchanged; true: we catch and re-raise as ours

    constructor(address admin_, IBalanceOf gate_, bool wrap_) MiniDao(admin_) {
        gate = gate_;
        wrap = wrap_;
    }

    function _vote(bytes32 proposal, Proposal storage p, address voter, Choice choice) internal override {
        uint256 bal;
        if (wrap) {
            try gate.balanceOf(voter) returns (uint256 b) {
                bal = b;
            } catch (bytes memory reason) {
                revert GateCallFailed(address(gate), reason);
            }
        } else {
            bal = gate.balanceOf(voter);
        }
        if (bal < 1) revert NoToken(address(gate), voter);
        super._vote(proposal, p, voter, choice);
    }
}
