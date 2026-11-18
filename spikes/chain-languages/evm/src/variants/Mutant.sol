// SPDX-License-Identifier: MIT
// A deliberately wrong contract: ties pass. The cross-check must catch it (proves the harness can fail).
pragma solidity ^0.8.24;

import {MiniDao} from "../MiniDao.sol";

contract MutantDao is MiniDao {
    constructor(address admin_) MiniDao(admin_) {}
    function _close(bytes32, Proposal storage p) internal view override returns (bool) { return p.yes >= p.no; }
}
