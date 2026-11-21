// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Hats} from "hats/Hats.sol";
import {Safe} from "safe/Safe.sol";
import {Enum} from "safe/libraries/Enum.sol";
import {SafeProxyFactory} from "safe/proxies/SafeProxyFactory.sol";
import {CompatibilityFallbackHandler} from "safe/handler/CompatibilityFallbackHandler.sol";
import {TestToken} from "./SafeFixtures.sol";

abstract contract HatFixture is Test {
    Hats internal hats;
    Safe internal safe;
    TestToken internal token;
    address internal ada;
    uint256 internal adaKey;
    address internal outsider;
    address internal recipient;
    uint256 internal personHat;

    function setUp() public virtual {
        (ada, adaKey) = makeAddrAndKey("ada");
        outsider = makeAddr("outsider");
        recipient = makeAddr("recipient");

        Safe singleton = new Safe();
        SafeProxyFactory factory = new SafeProxyFactory();
        address[] memory owners = new address[](1);
        owners[0] = ada;
        bytes memory initializer = abi.encodeCall(
            Safe.setup,
            (owners, 1, address(0), "", address(new CompatibilityFallbackHandler()), address(0), 0, payable(address(0)))
        );
        safe = Safe(payable(address(factory.createProxyWithNonce(address(singleton), initializer, 1))));
        vm.deal(address(safe), 10 ether);
        token = new TestToken();
        token.mint(address(safe), 100 ether);

        hats = new Hats("Spike hats", "");
        uint256 topHat = hats.mintTopHat(address(this), "Workshop", "");
        personHat = hats.createHat(topHat, "Ada", 1, address(this), address(this), true, "");
        assertTrue(hats.mintHat(personHat, ada));
    }

    function safeCall(address to, bytes memory data) internal {
        bytes memory signature;
        {
            bytes32 digest = safe.getTransactionHash(
                to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), address(0), safe.nonce()
            );
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(adaKey, digest);
            signature = abi.encodePacked(r, s, v);
        }
        assertTrue(safe.execTransaction(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signature
        ));
    }

    function enable(address module) internal {
        safeCall(address(safe), abi.encodeCall(safe.enableModule, (module)));
        assertTrue(safe.isModuleEnabled(module));
    }
}
