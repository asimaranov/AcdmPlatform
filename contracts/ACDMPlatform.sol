//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ACDMToken.sol";
import "./ItPubToken.sol";

import "./DAO.sol";
import "./interfaces/Uniswap.sol";

enum RoundType {
    Sale,
    Trade
}

struct Order {
    address payable seller;
    uint256 amount;
    uint256 ethPrice;
}

contract ACDMPlatform {
    address payable public owner;
    DAO public dao;
    uint256 public roundsNum;
    uint256 public ordersNum;
    uint256 public roundDeadline;
    uint256 public lastPrice;
    uint256 public roundTime;
    uint256 public tradeTurnover;
    uint256 public saleSupply;
    uint256 public internalBalance;
    uint256 public saleReferrer1RewardPromille;
    uint256 public saleReferrer2RewardPromille;
    uint256 public tradeReferrer1RewardPromille;
    uint256 public tradeReferrer2RewardPromille;

    address private constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    ACDMToken private token;
    ItPubToken private itPubToken;

    mapping(address => address payable) private referrers;
    mapping(uint256 => Order) private orders;

    event RoundStarted(RoundType roundType, uint256 roundId);

    event TokenBought(uint256 amount);
    
    event OrderCreated(uint256 orderId, Order order);

    modifier assertSaleRound() {
        require(getRoundType() == RoundType.Sale, "Available only in sale round");
        _;
    }

    modifier assertTradeRound() {
        require(roundsNum > 0, "Isn't available in first round");
        require(getRoundType() == RoundType.Trade, "Available only in trade round");
        _;
    }

    modifier onlyByChoice {
        require(msg.sender == address(dao), "You can't to that");
        _;
    }

    constructor(address daoAddress, address acdmTokenAddress, address itPubTokenAddress, uint256 _roundTime) {
        token = ACDMToken(acdmTokenAddress);
        itPubToken = ItPubToken(itPubTokenAddress);
        dao = DAO(daoAddress);
        roundTime = _roundTime;
        owner = payable(msg.sender);

        saleReferrer1RewardPromille = 5_0;
        saleReferrer2RewardPromille = 3_0;

        tradeReferrer1RewardPromille = 2_5;
        tradeReferrer2RewardPromille = 2_5;
    }

    function register(address payable referrer) public {
        require(msg.sender != referrer, "Can't be a referrer for yourself");
        require(referrers[msg.sender] == address(0), "Aleady registered");

        referrers[msg.sender] = referrer;
    }

    function startSaleRound() public {
        require((getRoundType() == RoundType.Trade && block.timestamp >= roundDeadline) || roundsNum == 0, "Unable to start sale round");
        roundDeadline = block.timestamp + roundTime;

        if (roundsNum == 0) {
            saleSupply = 100_000_000_000;
            lastPrice = 10_000_000_000_000;
        }
        else {
            saleSupply = tradeTurnover / lastPrice;
            lastPrice = lastPrice * 103 / 100 + 0.000004 ether;
        }
        
        token.mint(address(this), saleSupply);
        roundsNum++;
    }

    function buyACDM() public payable assertSaleRound {
        require(msg.value > 0, "No money received");
        uint256 tokenAmount = msg.value * ACDMS / lastPrice;
        require(saleSupply >= tokenAmount , "Round balance exceeded");
        saleSupply -= tokenAmount;
        uint256 leftEther = processReferrers(msg.value, referrers[msg.sender], saleReferrer1RewardPromille, saleReferrer2RewardPromille);
        internalBalance += leftEther;
        token.transfer(msg.sender, tokenAmount);
        emit TokenBought(tokenAmount);
    }

    function startTradeRound() public {
        require(getRoundType() == RoundType.Sale && block.timestamp >= roundDeadline, "Unable to start trade round");
        roundDeadline = block.timestamp + roundTime;
        roundsNum++;
        tradeTurnover = 0;
        token.burn(saleSupply);
    }

    function addOrder(uint256 amount, uint256 ethPrice) public assertTradeRound returns (uint256 orderId) {
        orderId = ordersNum;
        token.transferFrom(msg.sender, address(this), amount);
        orders[orderId] = Order(payable(msg.sender), amount, ethPrice);
        ordersNum++;
        emit OrderCreated(orderId, orders[orderId]);
    }

    function removeOrder(uint256 orderId) public assertTradeRound {
        Order storage order = orders[orderId];
        uint256 amountToRefund = order.amount;
        require(order.seller == msg.sender, "It's not your order");
        token.transfer(msg.sender, amountToRefund);
        order.amount = 0;
    }

    function redeemOrder(uint256 orderId) public payable assertTradeRound {
        Order storage order = orders[orderId];
        
        require(msg.value > 0, "No money received");
        require(order.ethPrice >= msg.value, "You requested too much tokens");

        uint256 amountToRedeem = msg.value * order.amount / order.ethPrice;

        tradeTurnover += msg.value;

        order.amount -= amountToRedeem;
        order.ethPrice -= msg.value;

        uint256 ethForSeller = processReferrers(msg.value, referrers[msg.sender], tradeReferrer1RewardPromille, tradeReferrer2RewardPromille);
        token.transfer(msg.sender, amountToRedeem);
        order.seller.transfer(ethForSeller);
    }

    function setSaleReferrer1RewardPromille(uint256 newSaleReferrer1RewardPromille) public onlyByChoice {
        saleReferrer1RewardPromille = newSaleReferrer1RewardPromille;
    }

    function setSaleReferrer2RewardPromille(uint256 newSaleReferrer2RewardPromille) public onlyByChoice {
        saleReferrer2RewardPromille = newSaleReferrer2RewardPromille;
    }

    function setTradeReferrer1RewardPromille(uint256 newTradeReferrer1RewardPromille) public onlyByChoice {
        tradeReferrer1RewardPromille = newTradeReferrer1RewardPromille;
    }

    function setTradeReferrer2RewardPromille(uint256 newTradeReferrer2RewardPromille) public onlyByChoice {
        tradeReferrer2RewardPromille = newTradeReferrer2RewardPromille;
    }

    function sendCommissionToOwner() public onlyByChoice {
        uint256 platformBalance = internalBalance;
        require(platformBalance > 0, "Platform balance is empty");
        internalBalance = 0;
        owner.transfer(platformBalance);
    }

    function buyItPubTokensAndBurn() public onlyByChoice {

        uint256 platformBalance = internalBalance;
        require(platformBalance > 0, "Platform balance is empty");

        internalBalance = 0;

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = address(itPubToken);
        uint256[] memory amounts = IUniswapV2Router(ROUTER).swapExactETHForTokens{value: platformBalance}(0, path, address(this), block.timestamp + 100);
        itPubToken.burn(amounts[1]);
    }

    function getRoundType() public view returns (RoundType) {
        if (roundsNum % 2 == 1) 
            return RoundType.Sale;
        else 
            return RoundType.Trade;
    }

    function processReferrers(
        uint256 receivedEth,
        address payable referrer1, 
        uint256 referrer1RewardPromille, 
        uint256 referrer2RewardPromille) internal returns (uint256 leftEth) {

        address payable referrer2 = referrers[referrer1];

        uint256 serviceReward;
        uint256 referrer1Reward;
        uint256 referrer2Reward;

        uint256 reward1 = receivedEth * referrer1RewardPromille / 1000;
        uint256 reward2 = receivedEth * referrer2RewardPromille / 1000;

        if (referrer1 == address(0)) 
            serviceReward = reward1;
        else 
            referrer1Reward = reward1;

        if (referrer2 == address(0)) 
            serviceReward += reward2;
        else 
            referrer2Reward = reward2;

        if (serviceReward > 0) 
            internalBalance += serviceReward;
    
        if (referrer1Reward > 0)
            referrer1.transfer(referrer1Reward);
        
        if (referrer2Reward > 0)
            referrer2.transfer(referrer2Reward);
        
        return receivedEth - referrer1Reward - referrer2Reward - serviceReward;
    }

}
