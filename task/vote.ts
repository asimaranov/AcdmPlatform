import { task, types } from "hardhat/config";

task("vote", "Vote for a specific proposal")
    .addParam("contractAddr", "Address of the deployed DAO contract", "")
    .addParam("proposalId", "Id of proposal to vote for", 0, types.int)
    .addParam("against", "Vote against", false, types.boolean)

    .setAction(async (taskArgs, hre) => {
        const DAO = await hre.ethers.getContractAt("DAO", taskArgs['contractAddr']);

        const votingTransaction = await DAO.vote(taskArgs['proposalId'], taskArgs['against']);

        const rc = await votingTransaction.wait();
        const votedEvent = rc!.events!.find(e => e.event == 'Voted');

        const [[proposalId, totalVotes, deadline, recipient, isActive, callData, description]] = votedEvent!.args!;
        console.log(`Successfully voted for proposal ${proposalId}. Total proposal votes now: ${totalVotes}`);
    });
    