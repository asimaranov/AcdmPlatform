import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";

describe("Staking", function () {
    let ItPubToken: Contract;
    let ACDMToken: Contract;
    let ItPubEthLiqToken: Contract;

    let Staking: Contract;
    let DAO: Contract;
    let owner: SignerWithAddress, chairPerson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;

    const stakingAmont = 1_000_000;
    const defaultStakingCooldown = 1 * 60 * 60 * 24;
    const defaultRewardCooldown = 7 * 60 * 60 * 24;

    const firstProposalId = 0;

    const testMinimumQuorum = ethers.utils.parseEther("150.0");
    const testDebatingPeriodDuration = 24 * 60 * 60;

    const testUser1Amount = ethers.utils.parseEther("100.0");
    const testUser2Amount = ethers.utils.parseEther("200.0");

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

        await Staking.connect(owner).setDAO(DAO.address);

        await ItPubEthLiqToken.transfer(user1.address, testUser1Amount);
        await ItPubEthLiqToken.transfer(user2.address, testUser2Amount);

    });

    it("Check fail on zero coin staking", async function () {
        await expect(Staking.stake(0)).to.be.revertedWith("Unable to stake 0 tokens");
    });

    it("Check that user cant unstake during cooldown", async function () {
        await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
        await Staking.stake(stakingAmont);
        await expect(Staking.unstake()).to.be.revertedWith("It's too early");
    });

    it("Check that user cant unstake if haven't deposited any tokens", async function () {
        await expect(Staking.unstake()).to.be.revertedWith("No tokens to unstake");
    });

    it("Check that user cant get reward if haven't deposited any tokens", async function () {
        await expect(Staking.claim()).to.be.revertedWith("Nothing to claim");
    });

    it("Check that user cant get reward during cooldown", async function () {
        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);
        await Staking.connect(user1).stake(stakingAmont);
        await expect(Staking.connect(user1).claim()).to.be.revertedWith("Nothing to claim");
    });

    it("Check that user can unstake after cooldown", async function () {
        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);
        const initialBalance = await ItPubEthLiqToken.balanceOf(user1.address);
        await Staking.stake(stakingAmont);

        const balanceAfterStake = await ItPubEthLiqToken.balanceOf(user1.address);

        expect(initialBalance.sub(balanceAfterStake)).to.equal(stakingAmont);

        await network.provider.send("evm_increaseTime", [defaultStakingCooldown]);
        await Staking.unstake();

        const balanceAfterUnstake = await ItPubEthLiqToken.balanceOf(user1.address);
        expect(balanceAfterUnstake).to.equal(initialBalance);
    });

    it("Check that user can't unstake after cooldown if has active voting", async function () {
        await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser2Amount);
        await Staking.stake(stakingAmont);

        await network.provider.send("evm_increaseTime", [defaultStakingCooldown]);

        await DAO.connect(chairPerson).addProposal("0xdeadbeef", DAO.address, "Dumb proposal");

        await DAO.connect(user1).vote(firstProposalId, false);

        await expect(Staking.connect(user1).unstake()).to.be.revertedWith("You have an active voting");
    });

    it("Check Staked event correctness", async function () {
        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);

        const stakeTransaction = await Staking.stake(stakingAmont);
        const rc = await stakeTransaction.wait();

        const stakedEvent = rc.events.find((e: { event: string; }) => e.event == 'Staked');
        const [amount] = stakedEvent.args;

        expect(amount).to.be.equal(stakingAmont);
    });

    it("Check Unstaked event correctness", async function () {
        const stakingCooldown = 1 * 60 * 60 * 24;  // a week

        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);
        const initialBalance = await ItPubEthLiqToken.balanceOf(user1.address);
        await Staking.stake(stakingAmont);

        const balanceAfterStake = await ItPubEthLiqToken.balanceOf(user1.address);

        expect(initialBalance.sub(balanceAfterStake)).to.equal(stakingAmont);

        await network.provider.send("evm_increaseTime", [stakingCooldown]);
        const unstakingTransaction = await Staking.unstake();

        const rc = await unstakingTransaction.wait()

        const stakedEvent = rc.events.find((e: { event: string; }) => e.event == 'Unstaked');
        const [amount] = stakedEvent.args;

        expect(amount).to.be.equal(stakingAmont);
    });

    it("Check that user can get reward after a week", async function () {
        const claimCooldown = 7 * 60 * 60 * 24;  // a week

        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);
        await ItPubToken.connect(owner).transfer(Staking.address, stakingAmont);

        const initialReward = await ItPubToken.balanceOf(user1.address);
        await Staking.stake(stakingAmont);

        const rewardAfterStake = await ItPubToken.balanceOf(user1.address);

        expect(initialReward).to.equal(rewardAfterStake);

        await network.provider.send("evm_increaseTime", [claimCooldown]);
        await Staking.claim();

        const rewardAfterClaim = await ItPubToken.balanceOf(user1.address);

        expect(rewardAfterClaim - initialReward).to.be.equal(stakingAmont * await Staking.percentage() / 100);
    });

    it("Check that user can get reward after several weeks and get corresponding reward", async function () {
        const rewardsToClaimNum = 5;
        const claimCooldown = rewardsToClaimNum * 7 * 60 * 60 * 24;  // five weeks

        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);
        await ItPubToken.connect(owner).transfer(Staking.address, stakingAmont);

        const initialReward = await ItPubToken.balanceOf(user1.address);
        await Staking.stake(stakingAmont);

        const rewardAfterStake = await ItPubToken.balanceOf(user1.address);

        expect(initialReward).to.equal(rewardAfterStake);

        await network.provider.send("evm_increaseTime", [claimCooldown]);
        await Staking.claim();

        const rewardAfterClaim = await ItPubToken.balanceOf(user1.address);

        expect(rewardAfterClaim - initialReward).to.be.equal(rewardsToClaimNum * stakingAmont * await Staking.percentage() / 100);
    });

    it("Check that user can get reward multiple times", async function () {
        await ItPubEthLiqToken.connect(user1).approve(Staking.address, stakingAmont);
        await ItPubToken.connect(owner).transfer(Staking.address, stakingAmont);

        const initialReward = await ItPubToken.balanceOf(user1.address);
        await Staking.stake(stakingAmont);

        const rewardAfterStake = await ItPubToken.balanceOf(user1.address);

        expect(initialReward).to.equal(rewardAfterStake);

        await network.provider.send("evm_increaseTime", [defaultRewardCooldown]);
        await Staking.claim();

        await network.provider.send("evm_increaseTime", [defaultRewardCooldown]);
        await Staking.claim();

        await network.provider.send("evm_increaseTime", [defaultRewardCooldown]);
        await Staking.claim();

        const rewardAfterClaim = await ItPubToken.balanceOf(user1.address);

        expect(rewardAfterClaim - initialReward).to.be.equal(3 * stakingAmont * await Staking.percentage() / 100);
    });

    it("Check that only owner can set DAO for staking", async () => {
        await expect(Staking.connect(user1).setDAO(DAO.address)).to.be.revertedWith("Only owner can do that");
    });

    it("Check dao can't be set twice", async () => {
        await expect(Staking.connect(owner).setDAO(DAO.address)).to.be.revertedWith("DAO already initialized");
    });

    it("Check that even owner can't change staking cooldown in days", async () => {
        await expect(Staking.connect(owner).setStakingCooldownInDays(0)).to.be.revertedWith("Only DAO proposal can change it");
    });

});

describe("Staking dao initilization", function () {
    let Staking: Contract;

    this.beforeEach(async () => {
        const ItPubEthLiqTokenFactory = await ethers.getContractFactory("ItPubEthLiquidityToken");
        const ItPubEthLiqToken = await ItPubEthLiqTokenFactory.deploy();

        const ItPubTokenFactory = await ethers.getContractFactory("ItPubToken");
        const ItPubToken = await ItPubTokenFactory.deploy();

        const StakingFactory = await ethers.getContractFactory("Staking");
        Staking = await StakingFactory.deploy(ItPubEthLiqToken.address, ItPubToken.address);
    });

    it("Check that user can't unstake if dao is not set", async function () {
        await expect(Staking.unstake()).to.be.revertedWith("Please initialize DAO first");
    });

    it("Check that cooldown setter can't be called if dao is not set", async function () {
        await expect(Staking.setStakingCooldownInDays(0)).to.be.revertedWith("Please initialize DAO first");
    });
});
