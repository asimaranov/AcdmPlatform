//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ItPubEthLiquidityToken is ERC20 {
    constructor() ERC20("ItPubTokenEthLiquidityToken", "LITP") {
        _mint(msg.sender, 1_000 * 10 ** 18);
    }
}