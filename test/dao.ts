import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network } from "hardhat";

function genSetStakingCooldownCallData(newStakingCooldownInDays: number) {
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newStakingCooldownInDays",
        "type": "uint256"
      }
    ],
    "name": "setStakingCooldownInDays",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  ];

  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setStakingCooldownInDays', [newStakingCooldownInDays]);
}

function genSetMinimumQuorumCallData(newMinimumQuorum: BigNumber){
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newMinimumQuorum",
        "type": "uint256"
      }
    ],
    "name": "setMinimumQuorum",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setMinimumQuorum', [newMinimumQuorum]);
}

function genSetChairPersonCallData(newChairPerson: string){
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "address",
        "name": "newChairPerson",
        "type": "address"
      }
    ],
    "name": "setChairPerson",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setChairPerson', [newChairPerson]);
}

function genSetDebatingPeriodDurationCallData(newDebatingPeriodDuration: number){
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newDebatingPeriodDuration",
        "type": "uint256"
      }
    ],
    "name": "setDebatingPeriodDuration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setDebatingPeriodDuration', [newDebatingPeriodDuration]);
}

describe("Test DAO", function () {
  let ItPubToken: Contract;
  let ACDMToken: Contract;
  let ItPubEthLiqToken: Contract;

  let Staking: Contract;
  let DAO: Contract;

  let owner: SignerWithAddress, chairPerson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;


  const testMinimumQuorum = ethers.utils.parseEther("150.0");
  const testDebatingPeriodDuration = 24 * 60 * 60;

  const testUser1Amount = ethers.utils.parseEther("100.0");
  const testUser2Amount = ethers.utils.parseEther("200.0");

  let testCallData: string;
  let testRecepient: string;

  const testDescription = "Test description";

  const firstProposalId = 0;
  const secondProposalId = 1;

  const testStakingCooldown = 123;

  enum FinishedProposalStatus {
    Rejected = 0,
    RejectedTooFewQuorum = 1,
    ConfirmedCallSucceeded = 2,
    ConfirmedCallFailded = 3
  }

  this.beforeEach(async () => {

    [owner, chairPerson, user1, user2, user3] = await ethers.getSigners();

    const ItPubTokenFactory = await ethers.getContractFactory("ItPubToken");
    ItPubToken = await ItPubTokenFactory.deploy();

    const ItPubEthLiqTokenFactory = await ethers.getContractFactory("ItPubEthLiquidityToken");
    ItPubEthLiqToken = await ItPubEthLiqTokenFactory.deploy();

    const ACDMTokenFactory = await ethers.getContractFactory("ACDMToken");
    ACDMToken = await ACDMTokenFactory.deploy();
    
    const StakingFactory = await ethers.getContractFactory("Staking");
    Staking = await StakingFactory.deploy(ItPubEthLiqToken.address, ItPubToken.address);

    const DAOFactory = await ethers.getContractFactory("DAO");
    DAO = await DAOFactory.deploy(Staking.address, chairPerson.address, testMinimumQuorum, testDebatingPeriodDuration);

    await Staking.setDAO(DAO.address);

    testCallData = genSetStakingCooldownCallData(testStakingCooldown);
    testRecepient = Staking.address;

    await ItPubEthLiqToken.transfer(user1.address, testUser1Amount);
    await ItPubEthLiqToken.transfer(user2.address, testUser2Amount);
  });

  it("Check that only chair person can propose", async () => {
    await expect(DAO.connect(user1).addProposal(testCallData, testRecepient, testDescription)).to.be.revertedWith("Only chairperson can do that");
  });

  it("Check add proposal behaviour", async () => {
    const addProposalTransaction = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const rc = await addProposalTransaction.wait();
    const proposedEvent = rc.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = proposedEvent.args;
    expect(proposalId).to.equal(firstProposalId);
    expect(votesFor).to.equal(0);
    expect(votesAgainst).to.equal(0);
    expect(deadline * 1000 > Date.now());
    expect(recipient).to.equal(testRecepient);
    expect(callData).to.equal(testCallData);
    expect(description).to.equal(testDescription);
  });

  it("Check that proposals have different id", async () => {
    const addProposalTransaction1 = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const rc1 = await addProposalTransaction1.wait();
    const proposedEvent1 = rc1.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId1,]] = proposedEvent1.args;

    const addProposalTransaction2 = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const rc2 = await addProposalTransaction2.wait();
    const proposedEvent2 = rc2.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId2,]] = proposedEvent2.args;

    expect(proposalId1).to.equal(firstProposalId);
    expect(proposalId2).to.equal(secondProposalId);
  });

  it("Check that user can't vote if haven't deposited any tokens", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await expect(DAO.connect(user1).vote(firstProposalId, false)).revertedWith("No suffrage");
  });

  it("Check that user can't vote after deadline", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await expect(DAO.connect(user1).vote(firstProposalId, false)).revertedWith("Proposal voting ended");
  });

  it("Check voting for behaviour", async () => {
    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const votingTransaction = await DAO.connect(user1).vote(firstProposalId, false);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, votesAgainst, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount);
    expect(votesAgainst).to.equal(0);
  });

  it("Check voting against behaviour", async () => {
    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const votingTransaction = await DAO.connect(user1).vote(firstProposalId, true);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, votesAgainst, ]] = votedEvent.args;
    expect(votesFor).to.equal(0);
    expect(votesAgainst).to.equal(testUser1Amount);

  });

  it("Check voting for and against behaviour", async () => {
    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await DAO.connect(user1).vote(firstProposalId, false);
    const votingTransaction = await DAO.connect(user2).vote(firstProposalId, true);

    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, votesAgainst, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount);
    expect(votesAgainst).to.equal(testUser2Amount);

  });

  it("Check that user can't vote twice without new depposit", async () => {
    
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);

    await DAO.connect(user1).vote(firstProposalId, false);

    await expect(DAO.connect(user1).vote(firstProposalId, false)).to.be.revertedWith("No suffrage");;
  });


  it("Check that user can vote second time after new deposit", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount.div(2));
    await Staking.connect(user1).stake(testUser1Amount.div(2));
    await DAO.connect(user1).vote(firstProposalId, false);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount.div(2));
    await Staking.connect(user1).stake(testUser1Amount.div(2));

    const votingTransaction = await DAO.connect(user1).vote(firstProposalId, false);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount);
  });

  it("Check that user votes are combined", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);

    const votingTransaction = await DAO.connect(user2).vote(firstProposalId, false);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount.add(testUser2Amount));
  });

  it("Check that user can vote in multiple votings with the same tokens", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);

    const votingTransaction1 = await DAO.connect(user1).vote(firstProposalId, false);
    const rc1 = await votingTransaction1.wait();
    const votedEvent1 = rc1.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId1, votesFor1,]] = votedEvent1.args;
    expect(votesFor1).to.equal(testUser1Amount);

    const votingTransaction2 = await DAO.connect(user1).vote(secondProposalId, false);
    const rc2 = await votingTransaction2.wait();
    const votedEvent2 = rc2.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId2, votesFor2,]] = votedEvent2.args;
    expect(votesFor2).to.equal(testUser1Amount);
  });

  it("Check that user can't finish active voting", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await expect(DAO.connect(user1).finishProposal(firstProposalId)).revertedWith("Proposal voting is not ended");
  });

  it("Check proposal finishing, case of rejecting, no one voted", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.RejectedTooFewQuorum);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of rejecting, quorum less than needed", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.RejectedTooFewQuorum);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of rejecting, enough quorum but all voices are against", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, true);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.Rejected);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of rejecting, enough quorum but most voices are against", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, true);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.Rejected);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of enough quorum, most voted for, valid call", async () => {

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.ConfirmedCallSucceeded);
    expect(isActive).to.equal(false);
    expect(await Staking.stakingCooldownInDays()).to.equal(testStakingCooldown);
  });

  it("Check proposal finishing, case of enough quorum if unable to call function", async () => {

    await DAO.connect(chairPerson).addProposal(testCallData, ItPubToken.address, testDescription);  // Wrong recipient

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.ConfirmedCallFailded);
    expect(isActive).to.equal(false);
    expect(await await Staking.stakingCooldownInDays()).to.not.equal(testStakingCooldown);
  });

  it("Check that user can't vote in finished proposal votings", async () => {

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);

    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);

    await expect(DAO.connect(user1).vote(firstProposalId, false)).to.be.revertedWith("Proposal voting is not active");
  });

  it("Check that user can't finish a proposal twice", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user2).finishProposal(firstProposalId);
    await expect(DAO.connect(user2).finishProposal(firstProposalId)).to.be.revertedWith("Proposal voting is not active");
  });

  it("Check that user can't set new chairperson without voting ", async () => {
    await expect(DAO.connect(chairPerson).setChairPerson(user3.address)).to.be.revertedWith("You can't to that");
  });

  it("Check that user can't set new minimum quorum without voting ", async () => {
    await expect(DAO.connect(chairPerson).setMinimumQuorum(0)).to.be.revertedWith("You can't to that");
  });

  it("Check that user can't set new debating period without voting ", async () => {
    await expect(DAO.connect(chairPerson).setDebatingPeriodDuration(0)).to.be.revertedWith("You can't to that");
  });

  it("Test new chairperson choosing", async () => {
    await DAO.connect(chairPerson).addProposal(genSetChairPersonCallData(user3.address), DAO.address, "Choose new chairperson");

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.chairPerson()).to.equal(user3.address);
  });

  it("Test new minimum quorum choosing", async () => {
    const newMinimumQuorum = testMinimumQuorum.mul(2);
    await DAO.connect(chairPerson).addProposal(genSetMinimumQuorumCallData(newMinimumQuorum), DAO.address, "Choose new minimum quorum");

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.minimumQuorum()).to.equal(newMinimumQuorum);
  });

  it("Test new minimum quorum choosing", async () => {
    const newMinimumQuorum = testMinimumQuorum.mul(2);
    await DAO.connect(chairPerson).addProposal(genSetMinimumQuorumCallData(newMinimumQuorum), DAO.address, "Choose new minimum quorum");

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.minimumQuorum()).to.equal(newMinimumQuorum);
  });

  it("Test new debating period duration choosing", async () => {
    const newDebatingPeriodDuration = testDebatingPeriodDuration * 2;
    await DAO.connect(chairPerson).addProposal(genSetDebatingPeriodDurationCallData(newDebatingPeriodDuration), DAO.address, "Choose new debating period");

    await ItPubEthLiqToken.connect(user2).approve(Staking.address, testUser2Amount);
    await Staking.connect(user2).stake(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.debatingPeriodDuration()).to.equal(newDebatingPeriodDuration);
  });

  it("Check active voting determination correctness", async () => {
    let addProposalTransaction = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await ItPubEthLiqToken.connect(user1).approve(Staking.address, testUser1Amount);
    await Staking.connect(user1).stake(testUser1Amount);

    const rc = await addProposalTransaction.wait();
    const proposedEvent = rc.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = proposedEvent.args;

    expect(await DAO.hasActiveVoting(user1.address)).to.be.false;
    await DAO.connect(user1).vote(firstProposalId, false);
    expect(await DAO.hasActiveVoting(user1.address)).to.be.true;
    await network.provider.send("evm_increaseTime", [2500*testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.hasActiveVoting(user1.address)).to.be.false;
  });
});
