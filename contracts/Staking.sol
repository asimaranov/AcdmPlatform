//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DAO.sol";

contract Staking {
    address public owner;
    DAO public dao;
    bool public daoInitialized;

    uint256 public percentage;
    uint256 public stakingCooldownInDays;

    IERC20 private _stakingToken;
    IERC20 private _rewardToken;

    mapping(address => uint256) private _stakings;
    mapping(address => uint256) private _stakedAt;
    mapping(address => uint256) private _clamedAt;
    
    event Staked(uint256 amount);
    event Unstaked(uint256 amount);
    event Claimed(uint256 amount);

    function stake(uint256 amount) public {
        require(amount > 0, "Unable to stake 0 tokens");

        _stakingToken.transferFrom(msg.sender, address(this), amount);
        _stakings[msg.sender] += amount;
        _clamedAt[msg.sender] = block.timestamp;
        _stakedAt[msg.sender] = block.timestamp;

        emit Staked(amount);
    }

    function unstake() public {
        require(daoInitialized, "Please initialize DAO first");
        require(block.timestamp >= _stakedAt[msg.sender] + stakingCooldownInDays * 1 days, "It's too early");
        require(_stakings[msg.sender] > 0, "No tokens to unstake");
        require(!dao.hasActiveVoting(msg.sender), "You have an active voting");
        uint256 staking = _stakings[msg.sender];
        _stakings[msg.sender] = 0;
        _stakingToken.transfer(msg.sender, staking);
        emit Unstaked(staking);
    }

    function claim() public {
        uint256 stakingPeriod = block.timestamp - _clamedAt[msg.sender];
        uint256 reward = (_stakings[msg.sender] * percentage / 100) * (stakingPeriod / 7 days);
        require(reward > 0, "Nothing to claim");

        _clamedAt[msg.sender] = block.timestamp;
        _rewardToken.transfer(msg.sender, reward);
        emit Claimed(reward);
    }

    function setStakingCooldownInDays(uint256 newStakingCooldownInDays) public {
        require(daoInitialized, "Please initialize DAO first");
        require(msg.sender == address(dao), "Only DAO proposal can change it");
        stakingCooldownInDays = newStakingCooldownInDays;
    }

    function getStakedUserTokens(address user) public view returns (uint256) {
        return _stakings[user];
    }

    function setDAO(address daoAddress) public {
        require(msg.sender == owner, "Only owner can do that");
        require(!daoInitialized, "DAO already initialized");

        dao = DAO(daoAddress);
        daoInitialized = true;
    }

    constructor(address stakingToken, address rewardToken) {
        percentage = 3;
        stakingCooldownInDays = 1;
        _stakingToken = IERC20(stakingToken);
        _rewardToken = IERC20(rewardToken);
        owner = msg.sender;
    }
}
