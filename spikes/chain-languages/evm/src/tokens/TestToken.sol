// SPDX-License-Identifier: MIT
// "Someone else's token": OpenZeppelin's ERC20 (npm @openzeppelin/contracts 5.7.0), deployed by a different key.
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20, Ownable {
    constructor() ERC20("Membership", "MEM") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) { return 0; } // one unit is one unit

    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
}
