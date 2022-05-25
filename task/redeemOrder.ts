import { task, types } from "hardhat/config";

task("redeemOrder", "Redeem order from ACDM Platform")
    .addParam("contractAddr", "Address of the deployed ACDM Platform contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")
    .addParam("orderId", "Id of order to redeem", 0, types.int)
    .addParam("ethAmount", "Amount of eth to redeem")

    .setAction(async (taskArgs, hre) => {
        const ACDMPlatform = await hre.ethers.getContractAt("ACDMPlatform", taskArgs['contractAddr']);
        await ACDMPlatform.redeemOrder(taskArgs['orderId'], {value: hre.ethers.utils.parseEther(taskArgs['ethAmount'])});
        console.log(
            `Order successfully redeemed`
        );
    });
