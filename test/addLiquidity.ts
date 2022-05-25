import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("Uniswap liquidity adding", function () {
    let AddLiquidity: Contract;
    let ItPubToken: Contract;

    this.beforeEach(async () => {

        const AddLiquidityFactory = await ethers.getContractFactory("AddLiquidity");
        AddLiquidity = await AddLiquidityFactory.deploy();

        const ItPubTokenFactory = await ethers.getContractFactory("ItPubToken");
        ItPubToken = await ItPubTokenFactory.deploy();
    }); 

    it("Check liquidity adding", async function () {
        let amountEth = ethers.utils.parseEther("0.00001");
        let amountToken = ethers.utils.parseEther("1.0");
        ItPubToken.approve(AddLiquidity.address, amountToken);
        let addLiquidityTransaction = await AddLiquidity.addLiquidityEth(ItPubToken.address, amountToken, {
            value: amountEth
        });
        let rc = await addLiquidityTransaction.wait();
        
        let newLPTokenAddressEvent = rc.events.find((e: {event: string}) => e.event == "LPTokenAddress");
        let [newLPTokenAddress] = newLPTokenAddressEvent.args;

        let newLiquidityEvent = rc.events.find((e: {event: string}) => e.event == "NewLiquidity");
        let [newLiquidity] = newLiquidityEvent.args;

        expect(newLiquidity.gt(0)).to.be.true;
    });
});
