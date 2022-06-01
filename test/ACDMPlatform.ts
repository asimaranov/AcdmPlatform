import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { parseEther, parseUnits, toUtf8CodePoints } from "ethers/lib/utils";
import { ethers, network } from "hardhat";

enum RoundType {
    Sale = 0,
    Trade = 1
}

enum FinishedProposalStatus {
    Rejected = 0,
    RejectedTooFewQuorum = 1,
    ConfirmedCallSucceeded = 2,
    ConfirmedCallFailded = 3
}

function parseACDM(acdm: string): BigNumber {
    return parseUnits(acdm, 6);
}

function genSetRewardPromillePayload(functionName: string, newRewardPromille: number) {
    var jsonAbi = [{
        "inputs": [
            {
                "internalType": "uint256",
                "type": "uint256"
            }
        ],
        "name": functionName,
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const iface = new ethers.utils.Interface(jsonAbi);
    return iface.encodeFunctionData(functionName, [newRewardPromille]);
}

function genChooseInternalBalabceDestinyPayload(functionName: string) {
    var jsonAbi = [{
        "inputs": [],
        "name": functionName,
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }];

    const iface = new ethers.utils.Interface(jsonAbi);
    return iface.encodeFunctionData(functionName, []);
}

describe("ACDM Platform", function () {
    let ItPubToken: Contract;
    let ACDMToken: Contract;
    let ItPubEthLiqToken: Contract;

    let Staking: Contract;
    let DAO: Contract;
    let ACDMPlatform: Contract;
    let AddLiquidity: Contract;

    let owner: SignerWithAddress, chairPerson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;

    const firstProposalId = 0;

    const testMinimumQuorum = ethers.utils.parseEther("150.0");
    const testDebatingPeriodDuration = 24 * 60 * 60;

    const testUser1Amount = ethers.utils.parseEther("100.0");
    const testUser2Amount = ethers.utils.parseEther("200.0");

    const initialSupply = parseACDM("100000.0");

    const order1Id = 0;
    const order2Id = 1;

    const roundTime = 3 * 60 * 60 * 24;

    const testOrderTokenAmount = parseACDM("50000.0");
    const testOrderEthAmount = parseEther("0.5");


    this.beforeEach(async () => {
        [owner, chairPerson, user1, user2, user3] = await ethers.getSigners();

        const ItPubTokenFactory = await ethers.getContractFactory("ItPubToken");
        ItPubToken = await ItPubTokenFactory.deploy();

        const ItPubEthLiqTokenFactory = await ethers.getContractFactory("ItPubEthLiquidityToken");
        ItPubEthLiqToken = await ItPubEthLiqTokenFactory.deploy();

        const ACDMTokenFactory = await ethers.getContractFactory("ACDMToken");
        ACDMToken = await ACDMTokenFactory.deploy();

        const StakingFactory = await ethers.getContractFactory("Staking");
        Staking = await (await StakingFactory.deploy(ItPubEthLiqToken.address, ItPubToken.address)).connect(user1);

        const DAOFactory = await ethers.getContractFactory("DAO");
        DAO = await DAOFactory.deploy(Staking.address, chairPerson.address, testMinimumQuorum, testDebatingPeriodDuration);

        const ACDMPlatformFactory = await ethers.getContractFactory("ACDMPlatform");
        ACDMPlatform = await (await ACDMPlatformFactory.deploy(DAO.address, ACDMToken.address, ItPubToken.address, roundTime)).connect(user1);

        const AddLiquidityFactory = await ethers.getContractFactory("AddLiquidity");
        AddLiquidity = await AddLiquidityFactory.deploy();

        await Staking.connect(owner).setDAO(DAO.address);

        await ACDMToken.mint(owner.address, parseACDM("500000"));
        await ACDMToken.setOwner(ACDMPlatform.address);

        await ItPubEthLiqToken.transfer(user1.address, testUser1Amount);
        await ItPubEthLiqToken.transfer(user2.address, testUser2Amount);
    });

    it("Check sale round start correctness", async () => {
        const initialTokenSupply = await ACDMToken.totalSupply();
        await ACDMPlatform.startSaleRound();
        expect(await ACDMPlatform.roundsNum()).to.equal(1);
        expect(await ACDMPlatform.getRoundType()).to.equal(RoundType.Sale);
        expect(await ACDMPlatform.saleSupply()).to.equal(initialSupply);
        expect((await ACDMToken.totalSupply()).sub(initialSupply)).to.equal(initialTokenSupply);
    });

    it("Check that user can't launch trade round first", async () => {
        await expect(ACDMPlatform.startTradeRound()).to.be.revertedWith("Unable to start trade round");
    });

    it("Check that user can't buy acdm if round is not started", async () => {
        await expect(ACDMPlatform.buyACDM()).to.be.revertedWith("Available only in sale round");
    });

    it("Check that user can't buy tokens if not deposited any money", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.buyACDM()).to.be.revertedWith("No money received");
    });

    it("Check that user can't buy more than sale supply", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.buyACDM({ value: ethers.utils.parseEther("1.0") })).to.be.not.revertedWith("Round balance exceeded");
        await expect(ACDMPlatform.buyACDM({ value: ethers.utils.parseEther("1.1") })).to.be.revertedWith("Round balance exceeded");
    });

    it("Test token buying", async () => {
        const testAmount = ethers.utils.parseEther("1.0");
        await ACDMPlatform.startSaleRound();
        const intialSaleSupply = await ACDMPlatform.saleSupply();
        const buyTransaction = await ACDMPlatform.buyACDM({ value: testAmount });
        const rc = await buyTransaction.wait();
        const buyEvent = rc.events.find((e: { event: string }) => e.event == "TokenBought");
        const [tokenAmount] = buyEvent.args;
        expect(tokenAmount).to.equal(intialSaleSupply);
        expect(await ACDMToken.balanceOf(user1.address)).to.equal(intialSaleSupply);
        expect(await ACDMPlatform.internalBalance()).to.equal(testAmount);
    });

    it("Test referrall program correctness during token buying, case of two referrers", async () => {
        const testAmount = ethers.utils.parseEther("1.0");
        await ACDMPlatform.register(user2.address);
        await ACDMPlatform.connect(user2).register(user3.address);

        const initialReferrer1Balance = await user2.getBalance();
        const initialReferrer2Balance = await user3.getBalance();

        await ACDMPlatform.startSaleRound();
        const intialSaleSupply = await ACDMPlatform.saleSupply();
        const buyTransaction = await ACDMPlatform.buyACDM({ value: testAmount });
        const rc = await buyTransaction.wait();
        const buyEvent = rc.events.find((e: { event: string }) => e.event == "TokenBought");
        const [tokenAmount] = buyEvent.args;
        expect(tokenAmount).to.equal(intialSaleSupply);
        expect(await ACDMToken.balanceOf(user1.address)).to.equal(intialSaleSupply);
        const referrer1Payment = testAmount.mul(await ACDMPlatform.saleReferrer1RewardPromille()).div(1000);
        const referrer2Payment = testAmount.mul(await ACDMPlatform.saleReferrer2RewardPromille()).div(1000);

        expect(await ACDMPlatform.internalBalance()).to.equal(
            testAmount.sub(referrer1Payment).sub(referrer2Payment)
        );
        expect(await user2.getBalance()).to.equal(initialReferrer1Balance.add(referrer1Payment));
        expect(await user3.getBalance()).to.equal(initialReferrer2Balance.add(referrer2Payment));
    });

    it("Test referrall program correctness during token buying, case of one referrer", async () => {
        const testAmount = ethers.utils.parseEther("1.0");
        await ACDMPlatform.register(user2.address);

        const initialReferrer1Balance = await user2.getBalance();

        await ACDMPlatform.startSaleRound();
        const intialSaleSupply = await ACDMPlatform.saleSupply();
        const buyTransaction = await ACDMPlatform.buyACDM({ value: testAmount });
        const rc = await buyTransaction.wait();
        const buyEvent = rc.events.find((e: { event: string }) => e.event == "TokenBought");
        const [tokenAmount] = buyEvent.args;
        expect(tokenAmount).to.equal(intialSaleSupply);
        expect(await ACDMToken.balanceOf(user1.address)).to.equal(intialSaleSupply);
        const referrer1Payment = testAmount.mul(await ACDMPlatform.saleReferrer1RewardPromille()).div(1000);

        expect(await ACDMPlatform.internalBalance()).to.equal(testAmount.sub(referrer1Payment));
        expect(await user2.getBalance()).to.equal(initialReferrer1Balance.add(referrer1Payment));
    }); 

    it("Test partitial token buying", async () => {
        await ACDMPlatform.startSaleRound();
        const intialSaleSupply = await ACDMPlatform.saleSupply();
        await ACDMPlatform.buyACDM({ value: ethers.utils.parseEther("0.5") });
        await ACDMPlatform.buyACDM({ value: ethers.utils.parseEther("0.5") });
        expect(await ACDMToken.balanceOf(user1.address)).to.equal(intialSaleSupply);
    });

    it("Check that user can't be referrer to himself", async () => {
        await expect(ACDMPlatform.register(user1.address)).to.be.revertedWith("Can't be a referrer for yourself");
    });

    it("Check that user can't chenge referrer", async () => {
        await ACDMPlatform.register(user2.address);
        await expect(ACDMPlatform.register(user3.address)).to.be.revertedWith("Aleady registered");
    });

    it("Check that user can't start sale round in sale round before deadline", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.startSaleRound()).to.be.revertedWith("Unable to start sale round");
    });

    it("Check that user can't start sale round in sale round after deadline", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.startSaleRound()).to.be.revertedWith("Unable to start sale round");
    });

    it("Check that user can't start trade round before cooldown", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.startTradeRound()).to.be.revertedWith("Unable to start trade round");
    });

    it("Check that user can't add orders in sale round", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount)).to.be.revertedWith("Available only in trade round");
    });

    it("Check that user can't remove orders in sale round", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.removeOrder(order1Id)).to.be.revertedWith("Available only in trade round");
    });

    it("Check that user can't remove orders in first round", async () => {
        await expect(ACDMPlatform.removeOrder(order1Id)).to.be.revertedWith("Isn't available in first round");
    });

    it("Check that user can't add orders in first round", async () => {
        await expect(ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount)).to.be.revertedWith("Isn't available in first round");
    });

    it("Check that user can't redeem orders in first round", async () => {
        await expect(ACDMPlatform.redeemOrder(order1Id)).to.be.revertedWith("Isn't available in first round");
    });

    it("Check that user can't redeem orders in sale round", async () => {
        await ACDMPlatform.startSaleRound();
        await expect(ACDMPlatform.redeemOrder(order1Id)).to.be.revertedWith("Available only in trade round");
    });

    it("Test trade round starting", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();
        expect(await ACDMPlatform.roundsNum()).to.equal(2);
        expect(await ACDMPlatform.getRoundType()).to.equal(RoundType.Trade);
        expect(await ACDMPlatform.tradeTurnover()).to.equal(0);
    });

    it("Test order adding", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();

        await ACDMToken.transfer(user1.address, testOrderTokenAmount.mul(2));
        await ACDMToken.connect(user1).approve(ACDMPlatform.address, testOrderTokenAmount.mul(2));

        const addOrderTransaction1 = await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);
        const rc1 = await addOrderTransaction1.wait();
        const addOrderEvent1 = await rc1.events.find((e: { event: string }) => e.event == "OrderCreated");
        const [orderId1,] = addOrderEvent1.args;
        expect(orderId1).to.equal(order1Id);

        const addOrderTransaction2 = await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);
        const rc2 = await addOrderTransaction2.wait();
        const addOrderEvent2 = await rc2.events.find((e: { event: string }) => e.event == "OrderCreated");
        const [orderId2,] = addOrderEvent2.args;
        expect(orderId2).to.equal(order2Id);

    });

    it("Check that user can't remove order of another user", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();

        await ACDMToken.transfer(user1.address, testOrderTokenAmount);
        await ACDMToken.connect(user1).approve(ACDMPlatform.address, testOrderTokenAmount);

        await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);

        await expect(ACDMPlatform.connect(user2).removeOrder(order1Id)).to.be.revertedWith("It's not your order");
    });

    it("Test order removing", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();

        await ACDMToken.transfer(user1.address, testOrderTokenAmount);
        await ACDMToken.connect(user1).approve(ACDMPlatform.address, testOrderTokenAmount);

        const initialTokenBalance = await ACDMToken.balanceOf(user1.address);

        await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);

        const balanceAfterOrderCreation = await ACDMToken.balanceOf(user1.address);

        await ACDMPlatform.removeOrder(order1Id);

        const balanceAfterOrderRemoving = await ACDMToken.balanceOf(user1.address);

        expect(initialTokenBalance.gt(balanceAfterOrderCreation));
        expect(initialTokenBalance.eq(balanceAfterOrderRemoving));

    });

    it("Check that user can't redeem order if not deposited any money", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();

        await ACDMToken.transfer(user1.address, testOrderTokenAmount);
        await ACDMToken.connect(user1).approve(ACDMPlatform.address, testOrderTokenAmount);

        await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);

        await expect(ACDMPlatform.redeemOrder(order1Id)).to.be.revertedWith("No money received");
    });

    it("Check that user can't redeem more then listed in order", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();

        await ACDMToken.transfer(user1.address, testOrderTokenAmount);
        await ACDMToken.connect(user1).approve(ACDMPlatform.address, testOrderTokenAmount);

        await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);

        await expect(ACDMPlatform.redeemOrder(order1Id, { value: testOrderEthAmount })).to.be.not.reverted;
        await expect(ACDMPlatform.redeemOrder(order1Id, { value: testOrderEthAmount.add(1) })).to.be.revertedWith("You requested too much tokens");
    });

    it("Test redeem behaviour", async () => {
        await ACDMPlatform.startSaleRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();

        await ACDMToken.transfer(user1.address, testOrderTokenAmount);
        await ACDMToken.connect(user1).approve(ACDMPlatform.address, testOrderTokenAmount);

        await ACDMPlatform.addOrder(testOrderTokenAmount, testOrderEthAmount);

        const initialTokenBalance = await ACDMToken.balanceOf(user1.address);
        const initialEthBalance = await user1.getBalance();

        await ACDMPlatform.redeemOrder(order1Id, { value: testOrderEthAmount });
        const tokenBalanceAfterRedeem = await ACDMToken.balanceOf(user1.address);
        const ethBalanceAfterRedeem = await user1.getBalance();

        expect(tokenBalanceAfterRedeem).to.be.equal(initialTokenBalance + testOrderTokenAmount);
        expect(ethBalanceAfterRedeem.add(testOrderEthAmount).lte(initialEthBalance));


    });

    it("Check that saleReferrer1RewardPromille can't be set by user, only by DAO proposal", async () => {
        await expect(ACDMPlatform.connect(owner).setSaleReferrer1RewardPromille(0)).to.be.revertedWith("You can't to that");
    });

    it("Check that saleReferrer2RewardPromille can't be set by user, only by DAO proposal", async () => {
        await expect(ACDMPlatform.connect(owner).setSaleReferrer2RewardPromille(0)).to.be.revertedWith("You can't to that");
    });

    it("Check that tradeReferrer1RewardPromille can't be set by user, only by DAO proposal", async () => {
        await expect(ACDMPlatform.connect(owner).setTradeReferrer1RewardPromille(0)).to.be.revertedWith("You can't to that");
    });

    it("Check that tradeReferrer2RewardPromille can't be set by user, only by DAO proposal", async () => {
        await expect(ACDMPlatform.connect(owner).setTradeReferrer2RewardPromille(0)).to.be.revertedWith("You can't to that");
    });

    it("Check that sendCommissionToOwner can't be called by user, only by DAO proposal", async () => {
        await expect(ACDMPlatform.connect(owner).sendCommissionToOwner()).to.be.revertedWith("You can't to that");
    });

    it("Check that buyItPubTokensAndBurn can't be called by user, only by DAO proposal", async () => {
        await expect(ACDMPlatform.connect(owner).buyItPubTokensAndBurn()).to.be.revertedWith("You can't to that");
    });

    it("Check that saleReferrer1RewardPromille can be set by DAO", async () => {
        const newSaleReferrer1RewardPromille = 10_0;
        await DAO.connect(chairPerson).addProposal(genSetRewardPromillePayload("setSaleReferrer1RewardPromille", newSaleReferrer1RewardPromille), ACDMPlatform.address, "Change saleReferrer1RewardPromille");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        await DAO.connect(user1).finishProposal(firstProposalId);
        expect(await ACDMPlatform.saleReferrer1RewardPromille()).to.equal(newSaleReferrer1RewardPromille);
    });

    it("Check that saleReferrer2RewardPromille can be set by DAO", async () => {
        const newSaleReferrer2RewardPromille = 10_0;
        await DAO.connect(chairPerson).addProposal(genSetRewardPromillePayload("setSaleReferrer2RewardPromille", newSaleReferrer2RewardPromille), ACDMPlatform.address, "Change saleReferrer2RewardPromille");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        await DAO.connect(user1).finishProposal(firstProposalId);
        expect(await ACDMPlatform.saleReferrer2RewardPromille()).to.equal(newSaleReferrer2RewardPromille);
    });

    it("Check that tradeReferrer1RewardPromille can be set by DAO", async () => {
        const newTradeReferrer1RewardPromille = 10_0;
        await DAO.connect(chairPerson).addProposal(genSetRewardPromillePayload("setTradeReferrer1RewardPromille", newTradeReferrer1RewardPromille), ACDMPlatform.address, "Change tradeReferrer1RewardPromille");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        await DAO.connect(user1).finishProposal(firstProposalId);
        expect(await ACDMPlatform.tradeReferrer1RewardPromille()).to.equal(newTradeReferrer1RewardPromille);
    });

    it("Check that tradeReferrer2RewardPromille can be set by DAO", async () => {
        const newTradeReferrer2RewardPromille = 10_0;
        await DAO.connect(chairPerson).addProposal(genSetRewardPromillePayload("setTradeReferrer2RewardPromille", newTradeReferrer2RewardPromille), ACDMPlatform.address, "Change tradeReferrer2RewardPromille");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        await DAO.connect(user1).finishProposal(firstProposalId);
        expect(await ACDMPlatform.tradeReferrer2RewardPromille()).to.equal(newTradeReferrer2RewardPromille);
    });

    it("Check that commission can be sent to owner by DAO", async () => {
        const testAmount = ethers.utils.parseEther("1.0");
        await ACDMPlatform.startSaleRound();
        await ACDMPlatform.buyACDM({ value: testAmount });

        const intialOwnerBalance = await owner.getBalance();
        await DAO.connect(chairPerson).addProposal(genChooseInternalBalabceDestinyPayload("sendCommissionToOwner"), ACDMPlatform.address, "Send commission to owner");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        await DAO.connect(user1).finishProposal(firstProposalId);
        expect(await owner.getBalance()).to.equal(intialOwnerBalance.add(testAmount));
        expect(await ACDMPlatform.internalBalance()).to.equal(0);
    });

    it("Check that ItPub token can be bought and burnt by DAO", async () => {
        let amountEth = ethers.utils.parseEther("0.00001");
        let amountToken = ethers.utils.parseEther("1.0");
        ItPubToken.approve(AddLiquidity.address, amountToken);

        await AddLiquidity.addLiquidityEth(ItPubToken.address, amountToken, {
            value: amountEth
        });

        const initialItPubTokenSupply = await ItPubToken.totalSupply();
        const testAmount = ethers.utils.parseEther("0.000001");
        await ACDMPlatform.startSaleRound();
        await ACDMPlatform.buyACDM({ value: testAmount });

        await DAO.connect(chairPerson).addProposal(genChooseInternalBalabceDestinyPayload("buyItPubTokensAndBurn"), ACDMPlatform.address, "Send commission to owner");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        await DAO.connect(user1).finishProposal(firstProposalId);
        expect(await ACDMPlatform.internalBalance()).to.equal(0);
        expect(initialItPubTokenSupply.gt(await ItPubToken.totalSupply())).to.be.true;
    });

    it("Check that user can't send commission to owner if platform balance is empty", async () => {
        await DAO.connect(chairPerson).addProposal(genChooseInternalBalabceDestinyPayload("sendCommissionToOwner"), ACDMPlatform.address, "Send comission to owner");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
        const rc = await finishTransaction.wait();
        const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
        const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;
    
        expect(status).to.equal(FinishedProposalStatus.ConfirmedCallFailded);
    });

    it("Check that user can't buy ItPubToken and burn if platform balance is empty", async () => {
        await DAO.connect(chairPerson).addProposal(genChooseInternalBalabceDestinyPayload("buyItPubTokensAndBurn"), ACDMPlatform.address, "Buy ItPubToken and burn");

        await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
        await Staking.connect(user2).stake(testUser2Amount);
        await DAO.connect(user2).vote(firstProposalId, false);

        await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
        const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
        const rc = await finishTransaction.wait();
        const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
        const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;
    
        expect(status).to.equal(FinishedProposalStatus.ConfirmedCallFailded);
    });

    it("Check sale eth price correctness", async () => {
        await ACDMPlatform.startSaleRound();
        expect(await ACDMPlatform.lastPrice()).to.equal(parseEther("0.0000100"));
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startTradeRound();
        await network.provider.send("evm_increaseTime", [roundTime + 1]);
        await ACDMPlatform.startSaleRound();
        expect(await ACDMPlatform.lastPrice()).to.equal(parseEther("0.0000143"));
    });
});
