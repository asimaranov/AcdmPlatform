//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ACDMToken is ERC20 {

    address owner;

    constructor() ERC20("ACDM Coin", "ACDM") {
        owner = msg.sender;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can do that");
        _;
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function setOwner(address newOwner) public onlyOwner {
        owner = newOwner;
    }
}

