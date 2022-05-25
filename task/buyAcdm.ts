import { task } from "hardhat/config";

task("buyAcdm", "Buy acdm tokens")
    .addParam("contractAddr", "Address of the deployed ACDM Platform contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")
    .addParam("amountToBuy", "Amount of ether to buy")

    .setAction(async (taskArgs, hre) => {
        const ACDMPlatform = await hre.ethers.getContractAt("ACDMPlatform", taskArgs['contractAddr']);
        await ACDMPlatform.buyACDM({value: hre.ethers.utils.parseEther(taskArgs['amountToBuy'])});
        console.log(
            `Successfully bought`
        );
    });
