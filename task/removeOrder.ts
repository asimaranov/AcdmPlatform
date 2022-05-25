import { task, types } from "hardhat/config";

task("removeOrder", "Remove order from ACDM Platform")
    .addParam("contractAddr", "Address of the deployed ACDM Platform contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")
    .addParam("orderId", "Id of order to remove", 0, types.int)

    .setAction(async (taskArgs, hre) => {
        
        const ACDMPlatform = await hre.ethers.getContractAt("ACDMPlatform", taskArgs['contractAddr']);
        await ACDMPlatform.removeOrder(taskArgs['orderId']);
        console.log(
            `Order successfully removed`
        );
    });
