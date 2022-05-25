//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ItPubToken is ERC20 {
    constructor() ERC20("ItPub Coin", "ITP") {
        _mint(msg.sender, 1_000 * 10 ** 18);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}

