// SPDX-License-Identifier: MIT
// Tokens whose balanceOf fails in different ways, to see how a revert inside THEIR contract reaches us.
pragma solidity ^0.8.24;

contract PausedToken {
    error TokenPaused(uint256 until);
    function balanceOf(address) external pure returns (uint256) { revert TokenPaused(1_800_000_000); }
}

contract StringToken {
    function balanceOf(address) external pure returns (uint256) { revert("token: paused"); }
}

contract PanicToken {
    function balanceOf(address) external pure returns (uint256) { uint256 z = 0; return 1 / z; }
}

contract GasHogToken {
    function balanceOf(address) external view returns (uint256 x) { while (true) { x = gasleft(); } }
}
