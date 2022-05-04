//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract ERC20Token is ERC20 {
    constructor (string memory name, string memory symbol, uint supply) ERC20(name, symbol){
        _mint(msg.sender, supply * 10 ** 18);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20)
    {
        super._mint(to, amount);
    }

    function mintTokens(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}