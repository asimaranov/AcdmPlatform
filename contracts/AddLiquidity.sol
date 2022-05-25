//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "./interfaces/Uniswap.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract AddLiquidity {
    address private constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    event NewAmountA(uint256 amount);
    event NewAmountB(uint256 amount);
    event NewLiquidity(uint256 value);
    event LPTokenAddress(address pair);

    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
    }

    function addLiquidityEth(
        address _tokenA,
        uint256 _amountA
    ) public payable {
        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);
        IERC20(_tokenA).approve(ROUTER, _amountA);

        (uint256 newAmountA, uint256 newAmountB, uint256 newLiquidity) = 
        IUniswapV2Router(ROUTER).addLiquidityETH{value: msg.value}(_tokenA, _amountA, 0, 0, msg.sender, block.timestamp);

        emit NewAmountA(newAmountA);
        emit NewAmountB(newAmountB);
        emit NewLiquidity(newLiquidity);

        (address token0, address token1) = sortTokens(_tokenA, WETH);

        address pair = address(bytes20(keccak256(abi.encodePacked(
            hex'ff',
            FACTORY,
            keccak256(abi.encodePacked(token0, token1)),
            hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
        ))));

        emit LPTokenAddress(pair);
    }

    constructor () payable {  }
}
