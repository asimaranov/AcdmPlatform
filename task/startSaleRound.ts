import { task } from "hardhat/config";

task("startSaleRound", "Start sale round on ACDM Platform")
    .addParam("contractAddr", "Address of the deployed ACDM Platform contract", "0x06812Bc5aeC72685a599354FEEc0e4f2BE8B042c")

    .setAction(async (taskArgs, hre) => {

        const ACDMPlatform = await hre.ethers.getContractAt("ACDMPlatform", taskArgs['contractAddr']);
        await ACDMPlatform.startSaleRound();
        console.log(
            `Round successfully started`
        );
    });
