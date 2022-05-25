import { task } from "hardhat/config";

task("unstake", "Unstake tokens")
    .addParam("contractAddr", "Address of the deployed staking contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")

    .setAction(async (taskArgs, hre) => {

        const stakingContract = await hre.ethers.getContractAt("Staking", taskArgs['contractAddr']);

        const unstakingTransaction = await stakingContract.unstake().catch(err => console.log(err.error));
        const rc = await unstakingTransaction!.wait();

        const unstakedEvent = rc.events!.find(e => e.event == 'Unstaked');
        const [amount] = unstakedEvent!.args!;

        console.log(
            `Successfully unstaked ${hre.ethers.utils.formatEther(amount)} tokens`
        );

    });