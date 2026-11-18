// SPDX-License-Identifier: MIT
// Q5: four shapes of the same two errors. Compile each and compare selectors.
pragma solidity ^0.8.24;

contract V0_Original {
    error AlreadyVoted(bytes32 proposal);   // PR-001
    error ProposalExists(bytes32 proposal); // PR-002
    function a() external pure { revert AlreadyVoted(0); }
    function b() external pure { revert ProposalExists(0); }
}
contract V1_Renamed {
    error HasVoted(bytes32 proposal);       // renamed
    error ProposalExists(bytes32 proposal);
    function a() external pure { revert HasVoted(0); }
    function b() external pure { revert ProposalExists(0); }
}
contract V2_FieldAdded {
    error AlreadyVoted(bytes32 proposal, address voter); // field added
    error ProposalExists(bytes32 proposal);
    function a() external pure { revert AlreadyVoted(0, address(0)); }
    function b() external pure { revert ProposalExists(0); }
}
contract V3_Reordered {
    error ProposalExists(bytes32 proposal); // declared first now
    error AlreadyVoted(bytes32 proposal);
    function b() external pure { revert ProposalExists(0); }
    function a() external pure { revert AlreadyVoted(0); }
}
contract V4_FieldRenamed {
    error AlreadyVoted(bytes32 id);         // field renamed only
    error ProposalExists(bytes32 proposal);
    function a() external pure { revert AlreadyVoted(0); }
    function b() external pure { revert ProposalExists(0); }
}
contract V5_TypeWidened {
    error AlreadyVoted(uint256 proposal);   // type changed
    error ProposalExists(bytes32 proposal);
    function a() external pure { revert AlreadyVoted(0); }
    function b() external pure { revert ProposalExists(0); }
}
