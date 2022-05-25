import { task } from "hardhat/config";

task("addLiquidityEth", "Add liquidity to the uniswap")
    .addParam("contractAddr", "Address of the deployed contract", "0xBE4c3DA82fC72F5EaBe5692A856e4c1519d50996")
    .addParam("tokenAddr", "Address of token", "0xEde64552FbfF05c7dc076468c3a70C6B17CB5a37")
    .addParam("ethAmount", "Amount of eth to put into liquidity pool", "0.00001")
    .addParam("tokenAmount", "Amount of token to put into liquidity pool", "1.0")

    .setAction(async (taskArgs, hre) => {

        const amountToken = hre.ethers.utils.parseEther(taskArgs['tokenAmount']);
        const amountEth = hre.ethers.utils.parseEther(taskArgs['ethAmount']);

        const AddLiquidityContract = await hre.ethers.getContractFactory("AddLiquidity");

        const tokenContract = await hre.ethers.getContractAt("ERC20", taskArgs['tokenAddr']);

        const approveTransaction = await tokenContract.approve(taskArgs['contractAddr'], amountToken);

        await approveTransaction.wait();

        const addLiquidityContract = AddLiquidityContract.attach(taskArgs['contractAddr']);

        const addLiquidityTransaction = await addLiquidityContract.addLiquidityEth(
            tokenContract.address, amountToken, {
            value: amountEth
        });

        const rc = await addLiquidityTransaction.wait();

        console.log(rc);

        const newAmountAEvent = rc.events!.find(event => event.event === 'NewAmountA')!;
        const newAmountBEvent = rc.events!.find(event => event.event === 'NewAmountB')!;
        const newLiquidityEvent = rc.events!.find(event => event.event === 'NewLiquidity')!;
        const lpTokenAddress = rc.events!.find(event => event.event === 'LPTokenAddress')!;


        console.log(`New token amount: ${newAmountAEvent.args![0]}, new ETH amount: ${newAmountBEvent.args![0]}, new liquidity ${newLiquidityEvent.args![0]}. Lp token address: ${lpTokenAddress.args![0]}`);
    });
