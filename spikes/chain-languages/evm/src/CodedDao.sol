// SPDX-License-Identifier: MIT
// Q5 alternative: the stable code travels INSIDE the error: error Refused(bytes6 code, bytes data).
pragma solidity ^0.8.24;

contract CodedDao {
    error Refused(bytes6 code, bytes data); // one selector for every refusal; `data` = abi.encode(the error's fields)
    bytes6 internal constant PR_001 = "PR-001";
    bytes6 internal constant PR_002 = "PR-002";
    bytes6 internal constant AR_001 = "AR-001";
    bytes6 internal constant PR_900 = "PR-900";

    address public immutable admin;
    mapping(address => bool) public isMember;
    mapping(bytes32 => uint8) public stateOf; // 0 absent 1 open
    mapping(bytes32 => mapping(address => bool)) public voted;

    constructor(address a) { admin = a; isMember[a] = false; }
    function addMember(address m) external { if (msg.sender != admin) revert Refused(AR_001, ""); isMember[m] = true; }

    function open(bytes32 id) external {
        if (msg.sender != admin) revert Refused(AR_001, "");
        if (stateOf[id] != 0) revert Refused(PR_002, abi.encode(id));
        stateOf[id] = 1;
    }

    function vote(bytes32 id) external {
        if (!isMember[msg.sender]) revert Refused(AR_001, "");
        if (stateOf[id] != 1) revert Refused(PR_900, abi.encode(stateOf[id]));
        if (voted[id][msg.sender]) revert Refused(PR_001, abi.encode(id));
        voted[id][msg.sender] = true;
    }
}
