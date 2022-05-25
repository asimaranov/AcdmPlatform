import { task } from "hardhat/config";

task("stake", "Stake tokens")
    .addParam("contractAddr", "Address of the deployed staking contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")
    .addParam("tokenAddr", "Address of token", "0xf1C80DE1bb14aC337808A83b0e56A53425D72B67")
    .addParam("tokenAmount", "Amount of token", "0.0000000001")

    .setAction(async (taskArgs, hre) => {
        const tokenContract = await hre.ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", taskArgs['tokenAddr']);
        const stakingContract = await hre.ethers.getContractAt("Staking", taskArgs['contractAddr']);
        await tokenContract.approve(stakingContract.address, hre.ethers.utils.parseEther(taskArgs['tokenAmount']));
        const stakingTransaction = await stakingContract.stake(hre.ethers.utils.parseEther(taskArgs['tokenAmount']));

        const rc = await stakingTransaction.wait();
        const stakedEvent = rc.events!.find(e => e.event == 'Staked');

        const [amount, until] = stakedEvent!.args!;

        console.log(
            `Successfully staked ${hre.ethers.utils.formatEther(amount)} tokens until ${new Date(until * 1000).toLocaleString()}.\n`
        );
    });