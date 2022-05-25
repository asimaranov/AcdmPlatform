import { task, types } from "hardhat/config";

enum FinishedProposalStatus {
    Rejected = 0,
    ConfirmedCallSucceeded = 1,
    ConfirmedCallFailded = 2
  }

task("finishProposal", "Finish a specific proposal")
    .addParam("contractAddr", "Address of the deployed DAO contract", "")
    .addParam("proposalId", "Id of proposal to finish", 0, types.int)

    .setAction(async (taskArgs, hre) => {
        const DAO = await hre.ethers.getContractAt("DAO", taskArgs['contractAddr']);

        const finishTransaction = await DAO.finishProposal(taskArgs['proposalId']);

        const rc = await finishTransaction.wait();
        const finishEvent = rc!.events!.find(e => e.event == 'ProposalFinished');
        const [status, [proposalId, totalVotes, deadline, recipient, isActive, callData, description]] = finishEvent!.args!;
        const statuses: {[index: number]: string} = {
            0: "Rejected",
            1: "Confirmed, call succeesed",
            2: "Confirmed, call failed"
        }
        console.log(`Successfully finished with status: ${statuses[status]}`)
    });
