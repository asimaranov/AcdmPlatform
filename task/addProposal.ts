import { task, types } from "hardhat/config";

task("addProposal", "Add proposal to the DAO")
    .addParam("contractAddr", "Address of the deployed DAO contract", "")
    .addParam("callData", "Calldata of the proposal", "")
    .addParam("recipient", "Contract address to call", "")
    .addParam("description", "Description of the proposal", "")

    .setAction(async (taskArgs, hre) => {
        const DAO = await hre.ethers.getContractAt("DAO", taskArgs['contractAddr']);
        const addProposalTransaction = await DAO.addProposal(taskArgs["callData"], taskArgs["recipient"], taskArgs["description"]);

        const rc = await addProposalTransaction.wait();
        const proposedEvent = rc!.events!.find(e => e.event == 'Proposed')!;
        const [[proposalId, totalVotes, deadline, recipient, isActive, callData, description]] = proposedEvent.args!;

        
        console.log(`Successfully added proposal with id ${proposalId}`);
    });