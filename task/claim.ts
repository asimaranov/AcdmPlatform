import { task } from "hardhat/config";

task("claim", "Claim tokens")
    .addParam("contractAddr", "Address of the deployed staking contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")

    .setAction(async (taskArgs, hre) => {

        const stakingContract = await hre.ethers.getContractAt("Staking", taskArgs['contractAddr']);

        const claimTransaction = await stakingContract.claim().catch(err => console.log(err.error));
        const rc = await claimTransaction!.wait();

        const claimedEvent = rc.events!.find(e => e.event == 'Claimed');
        const [amount] = claimedEvent!.args!;

        console.log(
            `Successfully claimed ${hre.ethers.utils.formatEther(amount)} tokens`
        );

    });