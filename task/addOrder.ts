import { task } from "hardhat/config";

task("addOrder", "Add order to ACDM Platform")
    .addParam("contractAddr", "Address of the deployed ACDM Platform contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")
    .addParam("tokenAmount", "Amount of tokens")
    .addParam("ethAmount", "Amount of eth")

    .setAction(async (taskArgs, hre) => {
        
        const ACDMPlatform = await hre.ethers.getContractAt("ACDMPlatform", taskArgs['contractAddr']);
        await ACDMPlatform.addOrder(taskArgs['tokenAmount'], taskArgs['ethAmount']);
        console.log(
            `Order successfully added`
        );
    });
